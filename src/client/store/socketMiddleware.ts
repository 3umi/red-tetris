import type { Middleware } from '@reduxjs/toolkit';
import type { Socket } from 'socket.io-client';
import { getSpectrum } from '../../shared/board';
import type { ClientToServer, ServerToClient } from './protocol';
import {
    joinRequested, joinFailed, roomUpdated, startRequested, roundStarted,
    spectrumUpdated, playerOut, roundOver, left,
} from './roomSlice';
import { started, piecesReceived, penaltyReceived, reset } from './gameSlice';
import type { GameState } from '../game/engine';
import type { RoomState } from './roomSlice';

export type GameSocket = Socket<ServerToClient, ClientToServer>;
type State = { room: RoomState; game: GameState };

// Ask for more pieces when fewer than this many are left in the queue.
const LOW_QUEUE = 7;

export const createSocketMiddleware = (connect: () => GameSocket): Middleware<object, State> => (store) => {
    // The open connection, if any. Closed over rather than stored on an object, so the
    // client needs no `this`.
    const sockets: GameSocket[] = [];
    const current = (): GameSocket | undefined => sockets[0];
    // Piece indexes already asked for, so the same pieces are never requested twice.
    const requested: number[] = [];

    const listen = (socket: GameSocket) => {
        socket.on('roomUpdate', (data) => store.dispatch(roomUpdated(data)));
        socket.on('joinError', (message) => store.dispatch(joinFailed(message)));
        socket.on('gameStarted', ({ pieces }) => {
            requested.splice(0);
            // Replace the old game first: the last winner's game is still 'playing', and
            // reporting on it would ask the new round for pieces at the old index.
            store.dispatch(started(pieces));
            store.dispatch(roundStarted());
        });
        socket.on('pieces', ({ pieces }) => store.dispatch(piecesReceived(pieces)));
        socket.on('spectrum', (data) => store.dispatch(spectrumUpdated(data)));
        socket.on('penalty', (data) => store.dispatch(penaltyReceived(data)));
        socket.on('playerOut', ({ name }) => store.dispatch(playerOut(name)));
        socket.on('gameOver', (data) => store.dispatch(roundOver(data)));
    };

    // Tell the server what changed on our own board after an action.
    const report = (before: GameState, after: GameState, socket: GameSocket) => {
        if (after.locks > before.locks) {
            socket.emit('boardChanged', { spectrum: getSpectrum(after.board) });
            if (after.cleared > 1) {
                socket.emit('linesCleared', { count: after.cleared });
            }
        }
        if (after.status === 'lost' && before.status !== 'lost') {
            socket.emit('lost');
        }
        const from = after.locks + (after.piece ? 1 : 0) + after.queue.length;
        if (after.status === 'playing' && after.queue.length < LOW_QUEUE && !requested.includes(from)) {
            requested.push(from);
            socket.emit('requestPieces', { from });
        }
    };

    return (next) => (action) => {
        if (joinRequested.match(action)) {
            sockets.splice(0).forEach((socket) => socket.disconnect());
            const socket = connect();
            sockets.push(socket);
            listen(socket);
            socket.emit('joinRoom', action.payload);
        } else if (startRequested.match(action)) {
            current()?.emit('startGame');
        } else if (left.match(action)) {
            sockets.splice(0).forEach((socket) => socket.disconnect());
            store.dispatch(reset());
        }
        const before = store.getState().game;
        const result = next(action);
        const socket = current();
        if (socket) {
            report(before, store.getState().game, socket);
        }
        return result;
    };
};
