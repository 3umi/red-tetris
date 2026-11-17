import { describe, it, expect } from 'vitest';
import { createStore } from '../../src/client/store';
import room, {
    initialRoom, joinRequested, joinFailed, roomUpdated, startRequested, roundStarted, spectrumUpdated,
    playerOut, roundOver, left,
} from '../../src/client/store/roomSlice';
import { hardDropped, movedLeft, movedRight, rotated, softDropped, ticked, penaltyReceived } from '../../src/client/store/gameSlice';
import { placeOf, ordinal, roundSize } from '../../src/client/game/placing';
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
        expect(state.opponents.adam.status).toBe('out');
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
    it('marks the winner and takes the loss order from the server when the round is over', () => {
        const state = room(room(joined, roundStarted()), roundOver({ winner: 'sara', lost: ['adam', 'oumaima'] }));
        expect(state.phase).toBe('over');
        expect(state.winner).toBe('sara');
        expect(state.outOrder).toEqual(['adam', 'oumaima']);
        expect(state.opponents.sara.status).toBe('winner');
    });
    it('handles a round over with no winner, or with me as the winner', () => {
        expect(room(joined, roundOver({ winner: null, lost: ['oumaima'] })).winner).toBe(null);
        expect(room(joined, roundOver({ winner: 'oumaima', lost: ['sara', 'adam'] })).opponents).toEqual(joined.opponents);
    });
    it('starts the next round from the game-over screen with fresh opponents', () => {
        const next = [roundStarted(), playerOut('adam'), roundOver({ winner: 'sara', lost: ['adam', 'oumaima'] }), roundStarted()]
            .reduce(room, joined);
        expect(next.phase).toBe('playing');
        expect(next.outOrder).toEqual([]);
        expect(next.winner).toBe(null);
        expect(next.opponents.adam.status).toBe('playing');
    });
    it('adds a player who joins after the round is over', () => {
        const over = room(room(joined, roundStarted()), roundOver({ winner: 'sara', lost: ['adam', 'oumaima'] }));
        const state = room(over, roomUpdated({ host: 'oumaima', players: ['oumaima', 'sara', 'adam', 'yasmine'] }));
        expect(state.phase).toBe('over');
        expect(state.opponents.yasmine.status).toBe('playing');
    });
    it('keeps the round\'s players listed after they leave, until the next round', () => {
        const over = [roundStarted(), playerOut('adam'), roundOver({ winner: 'sara', lost: ['adam', 'oumaima'] })]
            .reduce(room, joined);
        const left = room(over, roomUpdated({ host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(left.opponents.adam.status).toBe('out');
        expect(left.roster).toEqual(['oumaima', 'sara', 'adam']);
        const next = room(left, roundStarted());
        expect(next.opponents.adam).toBeUndefined();
        expect(next.roster).toEqual(['oumaima', 'sara']);
    });
    it('marks a player who leaves mid-round as out', () => {
        const state = room(room(joined, roundStarted()), roomUpdated({ host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(state.opponents.adam.status).toBe('out');
    });
    it('leaves no change for requests handled by middleware', () => {
        expect(room(joined, startRequested())).toBe(joined);
    });
    it('forgets everything when leaving', () => {
        expect(room(joined, left())).toEqual(initialRoom);
    });
});

describe('placing', () => {
    const round = { roster: ['a', 'b', 'c', 'd'], outOrder: ['d', 'c', 'b'], winner: 'a' };
    it('counts only the players of the round', () => {
        expect(roundSize(round)).toBe(4);
        expect(roundSize({ roster: ['me'], outOrder: ['me'], winner: null })).toBe(1);
    });
    it('counts players who left without losing, and places the others among those who finished', () => {
        const left = { roster: ['a', 'b', 'c'], outOrder: ['c'], winner: 'a' };
        expect(roundSize(left)).toBe(3);
        expect(placeOf('c', left)).toBe(2);
        expect(placeOf('b', left)).toBe(null);
    });
    it('gives the winner first place and the first out last place', () => {
        expect(placeOf('a', round)).toBe(1);
        expect(placeOf('b', round)).toBe(2);
        expect(placeOf('d', round)).toBe(4);
    });
    it('has no place for someone who was not in the round', () => {
        expect(placeOf('e', round)).toBe(null);
    });
    it('writes ordinals', () => {
        expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map(ordinal))
            .toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st']);
    });
});

describe('socket middleware', () => {
    const setup = () => {
        const connections = fakeConnections();
        const store = createStore({ connect: connections.connect });
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
        server.serverSends('gameOver', { winner: 'oumaima', lost: ['sara'] });
        expect(store.getState().room).toMatchObject({ phase: 'over', winner: 'oumaima', outOrder: ['sara'] });
        server.serverSends('gameStarted', { pieces: ['Z'] });
        expect(store.getState().room).toMatchObject({ phase: 'playing', winner: null, outOrder: [] });
        expect(store.getState().game).toMatchObject({ status: 'playing', locks: 0, penalty: 0, queue: [] });
        expect(store.getState().game.piece?.type).toBe('Z');
    });
    it('shows join errors', () => {
        const { store, server } = setup();
        server.serverSends('joinError', 'Error: oumaima name already exists in pelicans');
        expect(store.getState().room.error).toContain('already exists');
    });
    it('asks the server to start a round', () => {
        const { store, server } = setup();
        store.dispatch(startRequested());
        expect(server.sent('startGame')).toHaveLength(1);
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
            preloadedState: {
                game: {
                    status: 'playing', board, queue: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'], locks: 0, cleared: 0, penalty: 0, lastPenaltyFrom: null, score: 0, lines: 0,
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
    it('asks for pieces from the start again in the next round', () => {
        const { server } = setup();
        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T'] });
        server.serverSends('gameOver', { winner: null, lost: ['oumaima'] });
        server.serverSends('gameStarted', { pieces: ['S', 'Z', 'L'] });
        expect(server.sent('requestPieces')).toEqual([{ from: 3 }, { from: 3 }]);
    });
    it('starts the new round before asking for pieces, when the last winner was still playing', () => {
        const { store, server } = setup();
        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I', 'O', 'T'] });
        store.dispatch(hardDropped());
        server.serverSends('gameOver', { winner: 'oumaima', lost: ['sara'] });
        expect(store.getState().game.status).toBe('playing');
        const before = server.sent('requestPieces').length;
        server.serverSends('gameStarted', { pieces: ['S', 'Z', 'L'] });
        expect(server.sent('requestPieces').slice(before)).toEqual([{ from: 3 }]);
        expect(server.sent('boardChanged')).toHaveLength(1);
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
