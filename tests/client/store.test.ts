import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/client/store';
import room, {
    initialRoom, joinRequested, joinFailed, roomUpdated, startRequested, roundStarted, spectrumUpdated,
    playerOut, roundOver, restartRequested, roundReset, left,
} from '../../src/client/store/roomSlice';
import { hardDropped, movedLeft, movedRight, rotated, softDropped, ticked, penaltyReceived } from '../../src/client/store/gameSlice';
import { placeOf, ordinal } from '../../src/client/game/placing';
import { createBoard, fullRow } from '../../src/shared/board';
import { fakeConnections } from './fakeSocket';

const joined = room(room(initialRoom, joinRequested({ room: 'pelicans', player: 'oumaima' })),
    roomUpdated({ host: 'oumaima', players: ['oumaima', 'sara', 'adam'] }));

describe('room reducer', () => {
    it('remembers the room and name when joining', () => {
        const state = room(initialRoom, joinRequested({ room: 'pelicans', player: 'oumaima' }));
        expect(state).toMatchObject({ room: 'pelicans', me: 'oumaima', phase: 'joining' });
    });
    it('moves to the lobby and lists opponents on the first room update', () => {
        expect(joined.phase).toBe('lobby');
        expect(joined.host).toBe('oumaima');
        expect(Object.keys(joined.opponents)).toEqual(['sara', 'adam']);
        expect(joined.opponents.sara).toEqual({ name: 'sara', status: 'playing', spectrum: Array(10).fill(0) });
    });
    it('keeps the phase and known spectrums on later updates', () => {
        const playing = room(room(joined, roundStarted()), spectrumUpdated({ name: 'sara', spectrum: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }));
        const state = room(playing, roomUpdated({ host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(state.phase).toBe('playing');
        expect(state.opponents.sara.spectrum[9]).toBe(10);
        expect(state.opponents.adam).toBeUndefined();
    });
    it('stores join errors', () => {
        expect(room(joined, joinFailed('taken')).error).toBe('taken');
    });
    it('ignores spectrums of unknown players', () => {
        expect(room(joined, spectrumUpdated({ name: 'nobody', spectrum: [] }))).toEqual(joined);
    });
    it('records players going out once, in order', () => {
        const state = [playerOut('adam'), playerOut('sara'), playerOut('adam'), playerOut('oumaima')]
            .reduce(room, room(joined, roundStarted()));
        expect(state.outOrder).toEqual(['adam', 'sara', 'oumaima']);
        expect(state.opponents.adam.status).toBe('out');
    });
    it('marks the winner when the round is over', () => {
        const state = room(room(joined, roundStarted()), roundOver({ winner: 'sara' }));
        expect(state.phase).toBe('over');
        expect(state.winner).toBe('sara');
        expect(state.opponents.sara.status).toBe('winner');
    });
    it('handles a round over with no winner, or with me as the winner', () => {
        expect(room(joined, roundOver({ winner: null })).winner).toBe(null);
        expect(room(joined, roundOver({ winner: 'oumaima' })).opponents).toEqual(joined.opponents);
    });
    it('goes back to the lobby with fresh opponents on reset', () => {
        const over = [roundStarted(), playerOut('adam'), roundOver({ winner: 'sara' }), roundReset()].reduce(room, joined);
        expect(over.phase).toBe('lobby');
        expect(over.outOrder).toEqual([]);
        expect(over.winner).toBe(null);
        expect(over.opponents.adam.status).toBe('playing');
    });
    it('leaves no change for requests handled by middleware', () => {
        expect(room(joined, startRequested())).toBe(joined);
        expect(room(joined, restartRequested())).toBe(joined);
    });
    it('forgets everything when leaving', () => {
        expect(room(joined, left())).toEqual(initialRoom);
    });
});

describe('placing', () => {
    const round = { players: ['a', 'b', 'c', 'd'], outOrder: ['d', 'c', 'b'], winner: 'a' };
    it('gives the winner first place and the first out last place', () => {
        expect(placeOf('a', round)).toBe(1);
        expect(placeOf('b', round)).toBe(2);
        expect(placeOf('d', round)).toBe(4);
    });
    it('has no place for someone still playing', () => {
        expect(placeOf('a', { ...round, winner: null })).toBe(null);
    });
    it('writes ordinals', () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal))
            .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st']);
    });
});

describe('socket middleware', () => {
    const setup = () => {
        const connections = fakeConnections();
        const store = createStore({ connect: connections.connect, dealLocally: false });
        store.dispatch(joinRequested({ room: 'pelicans', player: 'oumaima' }));
        return { store, connections, server: connections.last() };
    };

    it('connects and joins the room', () => {
        const { server } = setup();
        expect(server.sent('joinRoom')).toEqual([{ room: 'pelicans', player: 'oumaima' }]);
    });
    it('turns server messages into state', () => {
        const { store, server } = setup();
        server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] });
        server.serverSends('gameStarted', { pieces: ['T', 'O'] });
        server.serverSends('pieces', { pieces: ['I'] });
        server.serverSends('spectrum', { name: 'sara', spectrum: [5, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
        server.serverSends('penalty', { lines: 1, from: 'sara' });
        expect(store.getState().room.phase).toBe('playing');
        expect(store.getState().room.opponents.sara.spectrum[0]).toBe(5);
        expect(store.getState().game.piece?.type).toBe('T');
        expect(store.getState().game.queue).toEqual(['O', 'I']);
        expect(store.getState().game.lastPenaltyFrom).toBe('sara');
        server.serverSends('playerOut', { name: 'sara' });
        server.serverSends('gameOver', { winner: 'oumaima' });
        expect(store.getState().room).toMatchObject({ phase: 'over', winner: 'oumaima', outOrder: ['sara'] });
        server.serverSends('roundReset');
        expect(store.getState().room.phase).toBe('lobby');
        expect(store.getState().game.status).toBe('idle');
    });
    it('shows join errors', () => {
        const { store, server } = setup();
        server.serverSends('joinError', 'Error: oumaima name already exists in pelicans');
        expect(store.getState().room.error).toContain('already exists');
    });
    it('asks the server to start and restart', () => {
        const { store, server } = setup();
        store.dispatch(startRequested());
        store.dispatch(restartRequested());
        expect(server.sent('startGame')).toHaveLength(1);
        expect(server.sent('restartGame')).toHaveLength(1);
    });
    it('reports the spectrum when a piece locks, without cleared lines for a plain drop', () => {
        const { store, server } = setup();
        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I', 'O'] });
        store.dispatch(hardDropped());
        expect(server.sent('boardChanged')).toEqual([{ spectrum: [0, 0, 0, 1, 1, 1, 1, 0, 0, 0] }]);
        expect(server.sent('linesCleared')).toEqual([]);
    });
    it('sends linesCleared when a drop clears two lines', () => {
        const connections = fakeConnections();
        const board = createBoard();
        board[18] = [...fullRow().slice(0, 9), 0];
        board[19] = [...fullRow().slice(0, 9), 0];
        const store = createStore({
            connect: connections.connect,
            dealLocally: false,
            preloadedState: {
                game: {
                    status: 'playing', board, queue: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'], locks: 0, cleared: 0, penalty: 0, lastPenaltyFrom: null,
                    piece: { type: 'I', shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]], x: 7, y: 0 },
                },
            },
        });
        store.dispatch(joinRequested({ room: 'r', player: 'p' }));
        store.dispatch(hardDropped());
        expect(connections.last().sent('linesCleared')).toEqual([{ count: 2 }]);
    });
    it('tells the server once when we lose', () => {
        const { store, server } = setup();
        server.serverSends('gameStarted', { pieces: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'] });
        store.dispatch(penaltyReceived({ lines: 20, from: 'sara' }));
        store.dispatch(ticked());
        expect(store.getState().game.status).toBe('lost');
        expect(server.sent('lost')).toHaveLength(1);
    });
    it('asks for more pieces when the queue runs low, once per index', () => {
        const { store, server } = setup();
        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T'] });
        store.dispatch(hardDropped());
        store.dispatch(movedLeft());
        store.dispatch(movedRight());
        store.dispatch(rotated());
        store.dispatch(softDropped());
        store.dispatch(ticked());
        expect(server.sent('requestPieces')).toEqual([{ from: 3 }]);
        server.serverSends('pieces', { pieces: ['S', 'Z'] });
        store.dispatch(hardDropped());
        expect(server.sent('requestPieces')).toEqual([{ from: 3 }, { from: 5 }]);
    });
    it('closes the old connection when joining again or leaving', () => {
        const { store, connections } = setup();
        store.dispatch(joinRequested({ room: 'other', player: 'oumaima' }));
        expect(connections.sockets[0].state.connected).toBe(false);
        store.dispatch(left());
        expect(connections.sockets[1].state.connected).toBe(false);
        expect(store.getState().room).toEqual(initialRoom);
    });
});

describe('local dealer', () => {
    const setup = () => {
        const connections = fakeConnections();
        const store = createStore({ connect: connections.connect });
        store.dispatch(joinRequested({ room: 'solo', player: 'me' }));
        connections.last().serverSends('roomUpdate', { host: 'me', players: ['me'] });
        return { store };
    };

    it('starts a round with pieces dealt in the browser', () => {
        const { store } = setup();
        store.dispatch(startRequested());
        expect(store.getState().room.phase).toBe('playing');
        expect(store.getState().game.piece).not.toBe(null);
        expect(store.getState().game.queue.length).toBeGreaterThanOrEqual(7);
    });
    it('keeps the queue topped up', () => {
        const { store } = setup();
        store.dispatch(startRequested());
        Array.from({ length: 10 }).forEach(() => store.dispatch(movedLeft()));
        store.dispatch(hardDropped());
        store.dispatch(hardDropped());
        store.dispatch(hardDropped());
        expect(store.getState().game.queue.length).toBeGreaterThanOrEqual(7);
    });
    it('ends the round when the player loses, and goes back to the lobby on restart', () => {
        const { store } = setup();
        store.dispatch(startRequested());
        store.dispatch(penaltyReceived({ lines: 20, from: 'nobody' }));
        expect(store.getState().room.phase).toBe('over');
        store.dispatch(restartRequested());
        expect(store.getState().room.phase).toBe('lobby');
        expect(store.getState().game.status).toBe('idle');
    });
});
