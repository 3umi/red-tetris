// End to end: real client stores (Redux + socket middleware) talking to the real server
// over socket.io. The unit tests check each side alone; these check that they agree.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
import { io } from 'socket.io-client';
import { createApp } from '../src/server/app';
import { createStore, type AppStore, type RootState } from '../src/client/store';
import { joinRequested, startRequested, left } from '../src/client/store/roomSlice';
import { hardDropped, movedLeft, movedRight, rotated } from '../src/client/store/gameSlice';

let server: ReturnType<typeof createApp>;
let url: string;
let stores: AppStore[];

// With Math.random stubbed to 0, every bag comes out in this order.
const BAG = ['O', 'T', 'S', 'Z', 'J', 'L', 'I'];

beforeEach(async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    stores = [];
    const clientDir = mkdtempSync(joinPath(tmpdir(), 'red-tetris-e2e-'));
    writeFileSync(joinPath(clientDir, 'index.html'), '<div id="root"></div>');
    server = createApp({ clientDir });
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
    stores.forEach((store) => store.dispatch(left()));
    await server.io.close();
    vi.restoreAllMocks();
});

const player = () => {
    const store = createStore({ connect: () => io(url, { transports: ['websocket'], forceNew: true }) });
    stores.push(store);
    return store;
};

// Resolves once the store's state passes the check, or fails after a second.
const until = (store: AppStore, check: (state: RootState) => boolean): Promise<void> =>
    new Promise((resolve, reject) => {
        if (check(store.getState())) {
            resolve();
            return;
        }
        const timer = setTimeout(() => {
            unsubscribe();
            reject(new Error(`timed out; state was ${JSON.stringify(store.getState().room)}`));
        }, 1000);
        const unsubscribe = store.subscribe(() => {
            if (check(store.getState())) {
                clearTimeout(timer);
                unsubscribe();
                resolve();
            }
        });
    });

const join = async (room: string, name: string) => {
    const store = player();
    store.dispatch(joinRequested({ room, player: name }));
    await until(store, (state) => state.room.players.includes(name));
    return store;
};

// Two players in a room, with the round started by the host.
const startRound = async () => {
    const alice = await join('pelicans', 'alice');
    const bob = await join('pelicans', 'bob');
    alice.dispatch(startRequested());
    await Promise.all([alice, bob].map((store) => until(store, (state) => state.game.status === 'playing')));
    return { alice, bob };
};

// Rotate, shift and hard-drop the falling piece, then wait for enough pieces to keep going.
const place = async (store: AppStore, rotations: number, dx: number) => {
    Array.from({ length: rotations }).forEach(() => store.dispatch(rotated()));
    Array.from({ length: Math.abs(dx) }).forEach(() => store.dispatch(dx < 0 ? movedLeft() : movedRight()));
    store.dispatch(hardDropped());
    await until(store, (state) => state.game.status !== 'playing' || state.game.piece !== null);
};

describe('end to end', () => {
    it('makes the first player host and shows everyone in the room', async () => {
        const alice = await join('pelicans', 'alice');
        const bob = await join('pelicans', 'bob');
        await until(alice, (state) => state.room.players.length === 2);
        expect(alice.getState().room).toMatchObject({ phase: 'lobby', host: 'alice', players: ['alice', 'bob'] });
        expect(Object.keys(alice.getState().room.opponents)).toEqual(['bob']);
        expect(bob.getState().room.host).toBe('alice');
    });

    it('only starts when the host asks, and deals both players the same pieces', async () => {
        const alice = await join('pelicans', 'alice');
        const bob = await join('pelicans', 'bob');
        bob.dispatch(startRequested());
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(alice.getState().room.phase).toBe('lobby');

        alice.dispatch(startRequested());
        await Promise.all([alice, bob].map((store) => until(store, (state) => state.room.phase === 'playing')));
        expect(alice.getState().game.piece?.type).toBe(BAG[0]);
        expect(bob.getState().game.piece?.type).toBe(BAG[0]);
        expect(alice.getState().game.queue.slice(0, 6)).toEqual(BAG.slice(1));
        expect(bob.getState().game.queue).toEqual(alice.getState().game.queue);
    });

    it('refuses a new player while a round is running', async () => {
        await startRound();
        const carol = player();
        carol.dispatch(joinRequested({ room: 'pelicans', player: 'carol' }));
        await until(carol, (state) => state.room.error !== null);
        expect(carol.getState().room.phase).toBe('joining');
    });

    it('sends the spectrum, and one red line to the opponent for a two-line clear', async () => {
        const { alice, bob } = await startRound();
        // Found by searching the bag O T S Z J L I: the seventh drop clears rows 18 and 19.
        const plan = [[0, -3], [0, 2], [0, 0], [0, 4], [2, 4], [2, 0], [1, -5]];
        for (const [rotations, dx] of plan) {
            await place(alice, rotations, dx);
        }
        expect(alice.getState().game.cleared).toBe(2);
        await until(bob, (state) => state.game.penalty === 1);
        expect(bob.getState().game.lastPenaltyFrom).toBe('alice');
        expect(bob.getState().game.board[19].every((cell) => cell === 8)).toBe(true);
        await until(bob, (state) => state.room.opponents.alice.spectrum.some((height) => height > 0));
        expect(alice.getState().game.penalty).toBe(0);
    });

    it('ends the round when a player tops out, then restarts with fresh pieces for both', async () => {
        const { alice, bob } = await startRound();
        while (bob.getState().game.status === 'playing') {
            await place(bob, 0, 0);
        }
        await Promise.all([alice, bob].map((store) => until(store, (state) => state.room.phase === 'over')));
        expect(alice.getState().room).toMatchObject({ winner: 'alice', outOrder: ['bob'] });
        expect(bob.getState().room).toMatchObject({ winner: 'alice', outOrder: ['bob'] });
        expect(alice.getState().room.opponents.bob.status).toBe('out');

        // Alice won, so her old game is still 'playing' when the next round starts.
        alice.dispatch(startRequested());
        await Promise.all([alice, bob].map((store) => until(store, (state) => state.room.phase === 'playing')));
        await new Promise((resolve) => setTimeout(resolve, 50));
        expect(alice.getState().game).toMatchObject({ status: 'playing', locks: 0, penalty: 0 });
        expect(alice.getState().game.queue).toEqual(bob.getState().game.queue);
        expect(alice.getState().room.outOrder).toEqual([]);
    });

    it('hands the host role on when the host leaves, and ends the round for a lone player', async () => {
        const { alice, bob } = await startRound();
        alice.dispatch(left());
        await until(bob, (state) => state.room.host === 'bob' && state.room.phase === 'over');
        expect(bob.getState().room.winner).toBe('bob');
        expect(bob.getState().room.opponents.alice.status).toBe('out');
    });
});
