import type { Middleware } from '@reduxjs/toolkit';
import { createBag } from '../../shared/pieces';
import { startRequested, restartRequested, roundStarted, roundOver, roundReset, type RoomState } from './roomSlice';
import { started, piecesReceived, reset } from './gameSlice';
import type { GameState } from '../game/engine';

// TEMPORARY: stands in for the server until it can start rounds and deal pieces.
// It deals pieces in the browser, so it only makes sense for a solo game. Remove it
// from the store once the server sends gameStarted, pieces, gameOver and roundReset.

type State = { room: RoomState; game: GameState };

const LOW_QUEUE = 7;

export const localDealer = (random: () => number): Middleware<object, State> => (store) => (next) => (action) => {
    if (startRequested.match(action)) {
        store.dispatch(roundStarted());
        store.dispatch(started([...createBag(random), ...createBag(random)]));
    } else if (restartRequested.match(action)) {
        store.dispatch(reset());
        store.dispatch(roundReset());
    }
    const before = store.getState();
    const result = next(action);
    const { game, room } = store.getState();
    if (game.status === 'playing' && game.queue.length < LOW_QUEUE) {
        store.dispatch(piecesReceived(createBag(random)));
    }
    if (game.status === 'lost' && before.game.status !== 'lost' && room.phase === 'playing') {
        store.dispatch(roundOver({ winner: null }));
    }
    return result;
};
