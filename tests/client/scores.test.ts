import { describe, it, expect } from 'vitest';
import { createScoreBook, browserStorage, STORAGE_KEY, type KeyValueStorage } from '../../src/client/scores/scoreBook';
import { createStore } from '../../src/client/store';
import { joinRequested } from '../../src/client/store/roomSlice';
import { hardDropped } from '../../src/client/store/gameSlice';
import { fakeConnections } from './fakeSocket';

const memoryStorage = (initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } => {
    const data = { ...initial };
    return {
        data,
        getItem: (key) => data[key] ?? null,
        setItem: (key, value) => {
            data[key] = value;
        },
    };
};

const failingStorage: KeyValueStorage = {
    getItem: () => {
        throw new Error('blocked');
    },
    setItem: () => {
        throw new Error('blocked');
    },
};

describe('score book', () => {
    it('has no record for a new name', () => {
        expect(createScoreBook(memoryStorage()).get('alice')).toBe(null);
    });
    it('keeps the best score, and counts rounds and wins per name', () => {
        const book = createScoreBook(memoryStorage());
        book.record('alice', { score: 300, won: false });
        book.record('alice', { score: 900, won: true });
        expect(book.record('alice', { score: 500, won: true })).toEqual({ name: 'alice', best: 900, rounds: 3, wins: 2 });
        expect(book.get('bob')).toBe(null);
    });
    it('saves to storage, so a new book on the same storage sees the records', () => {
        const storage = memoryStorage();
        createScoreBook(storage).record('alice', { score: 300, won: false });
        expect(JSON.parse(storage.data[STORAGE_KEY]).alice.best).toBe(300);
        expect(createScoreBook(storage).get('alice')?.best).toBe(300);
    });
    it('lists the top scores, highest first, leaving out players with no points', () => {
        const book = createScoreBook(memoryStorage());
        book.record('alice', { score: 300, won: false });
        book.record('bob', { score: 900, won: false });
        book.record('carol', { score: 300, won: false });
        book.record('dan', { score: 0, won: false });
        expect(book.top(5).map((record) => record.name)).toEqual(['bob', 'alice', 'carol']);
        expect(book.top(1).map((record) => record.name)).toEqual(['bob']);
    });
    it('ignores broken or tampered data in storage', () => {
        const storage = memoryStorage({
            [STORAGE_KEY]: JSON.stringify({
                alice: { name: 'alice', best: 300, rounds: 1, wins: 0 },
                bob: { name: 'bob', best: -5, rounds: 1, wins: 0 },
                carol: { name: 'mallory', best: 9999, rounds: 1, wins: 0 },
                dan: 'nonsense',
            }),
        });
        expect(createScoreBook(storage).top(5).map((record) => record.name)).toEqual(['alice']);
        expect(createScoreBook(memoryStorage({ [STORAGE_KEY]: '{not json' })).get('alice')).toBe(null);
        expect(createScoreBook(memoryStorage({ [STORAGE_KEY]: '42' })).get('alice')).toBe(null);
    });
    it('still works for this visit when storage is missing or blocked', () => {
        [null, failingStorage].forEach((storage) => {
            const book = createScoreBook(storage);
            book.record('alice', { score: 300, won: false });
            expect(book.get('alice')?.best).toBe(300);
        });
    });
    it('finds no browser storage outside a browser', () => {
        expect(browserStorage()).toBe(null);
    });
});

describe('saving scores', () => {
    const setup = (storage = memoryStorage()) => {
        const connections = fakeConnections();
        const book = createScoreBook(storage);
        const store = createStore({ connect: connections.connect, scoreBook: book });
        store.dispatch(joinRequested({ room: 'pelicans', player: 'alice' }));
        const server = connections.last();
        server.serverSends('roomUpdate', { host: 'alice', players: ['alice', 'bob'] });
        return { store, server, book };
    };

    it('loads the player\'s record when they join', () => {
        const storage = memoryStorage();
        createScoreBook(storage).record('alice', { score: 700, won: true });
        const { store } = setup(storage);
        expect(store.getState().scores.mine).toEqual({ name: 'alice', best: 700, rounds: 1, wins: 1 });
    });
    it('saves the round when it is over, marks a new best, and updates the top list', () => {
        const { store, server, book } = setup();
        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I'] });
        store.dispatch(hardDropped());
        const score = store.getState().game.score;
        expect(score).toBeGreaterThan(0);
        server.serverSends('gameOver', { winner: 'alice', lost: ['bob'] });
        expect(book.get('alice')).toEqual({ name: 'alice', best: score, rounds: 1, wins: 1 });
        expect(store.getState().scores).toMatchObject({ newBest: true, mine: { best: score } });
        expect(store.getState().scores.top.map((record) => record.name)).toEqual(['alice']);

        server.serverSends('gameStarted', { pieces: ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I'] });
        expect(store.getState().scores.newBest).toBe(false);
        server.serverSends('gameOver', { winner: 'bob', lost: ['alice'] });
        expect(store.getState().scores).toMatchObject({ newBest: false, mine: { best: score, rounds: 2, wins: 1 } });
    });
    it('saves nothing for a player who did not play the round', () => {
        const { server, book } = setup();
        server.serverSends('gameOver', { winner: 'bob', lost: [] });
        expect(book.get('alice')).toBe(null);
    });
    it('shows the saved top scores as soon as the app starts', () => {
        const storage = memoryStorage();
        createScoreBook(storage).record('bob', { score: 400, won: false });
        const store = createStore({ connect: fakeConnections().connect, scoreBook: createScoreBook(storage) });
        expect(store.getState().scores.top).toEqual([{ name: 'bob', best: 400, rounds: 1, wins: 0 }]);
    });
});
