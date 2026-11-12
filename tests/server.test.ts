import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { createApp } from '../src/server/app';

type RoomUpdate = { host: string; players: string[] };

let server: ReturnType<typeof createApp>;
let url: string;
let clients: Socket[];

const client = (): Promise<Socket> => new Promise((resolve) => {
    const socket = connect(url, { transports: ['websocket'], forceNew: true });
    clients.push(socket);
    socket.on('connect', () => resolve(socket));
});

const next = <T>(socket: Socket, event: string): Promise<T> =>
    new Promise((resolve) => socket.once(event, resolve));

const join = async (socket: Socket, room: string, player: string) => {
    const update = next<RoomUpdate>(socket, 'roomUpdate');
    socket.emit('joinRoom', { room, player });
    return update;
};

beforeEach(async () => {
    clients = [];
    server = createApp();
    await new Promise<void>((resolve) => server.httpServer.listen(0, resolve));
    url = `http://localhost:${(server.httpServer.address() as AddressInfo).port}`;
});

afterEach(async () => {
    clients.forEach((socket) => socket.disconnect());
    await server.io.close();
});

describe('http', () => {
    it('serves the home page', async () => {
        const res = await fetch(url);
        expect(await res.text()).toContain('Red Tetris');
    });
    it('serves the room page', async () => {
        const res = await fetch(`${url}/room/alice`);
        expect(await res.text()).toContain('joinRoom');
    });
});

describe('joinRoom', () => {
    it('makes the first player the host', async () => {
        const a = await client();
        expect(await join(a, 'r', 'alice')).toEqual({ host: 'alice', players: ['alice'] });
    });
    it('adds later players and tells everyone in the room', async () => {
        const a = await client();
        const b = await client();
        await join(a, 'r', 'alice');
        const seenByAlice = next<RoomUpdate>(a, 'roomUpdate');
        await join(b, 'r', 'bob');
        expect(await seenByAlice).toEqual({ host: 'alice', players: ['alice', 'bob'] });
    });
    it('rejects a name already used in the room', async () => {
        const a = await client();
        const b = await client();
        await join(a, 'r', 'alice');
        const error = next<string>(b, 'joinError');
        b.emit('joinRoom', { room: 'r', player: 'alice' });
        expect(await error).toContain('already exists');
    });
    it('rejects joining a room whose game has started', async () => {
        const a = await client();
        await join(a, 'r', 'alice');
        server.rooms.get('r')?.start(a.id!);
        const b = await client();
        const error = next<string>(b, 'joinError');
        b.emit('joinRoom', { room: 'r', player: 'bob' });
        expect(await error).toContain('already started');
    });
    it.each([
        ['null', null],
        ['no fields', {}],
        ['a number room', { room: 1, player: 'alice' }],
        ['an empty name', { room: 'r', player: '' }],
        ['a name that is too long', { room: 'r', player: 'x'.repeat(33) }],
        ['a whitespace-only name', { room: 'r', player: '   ' }],
    ])('rejects %s and keeps running', async (_, data) => {
        const a = await client();
        const error = next<string>(a, 'joinError');
        a.emit('joinRoom', data);
        expect(await error).toContain('must be');
        expect(await join(await client(), 'r', 'alice')).toEqual({ host: 'alice', players: ['alice'] });
    });
    it.each(['toString', 'constructor', '__proto__'])('treats "%s" as a normal room name', async (name) => {
        const a = await client();
        expect(await join(a, name, 'alice')).toEqual({ host: 'alice', players: ['alice'] });
    });
    it('rejects a second join from the same connection', async () => {
        const a = await client();
        await join(a, 'r1', 'alice');
        const error = next<string>(a, 'joinError');
        a.emit('joinRoom', { room: 'r2', player: 'bob' });
        expect(await error).toContain('already in r1');
        expect(server.rooms.has('r2')).toBe(false);
    });
});

describe('disconnect', () => {
    it('removes the player and tells the others', async () => {
        const a = await client();
        const b = await client();
        await join(a, 'r', 'alice');
        await join(b, 'r', 'bob');
        const update = next<RoomUpdate>(a, 'roomUpdate');
        b.disconnect();
        expect(await update).toEqual({ host: 'alice', players: ['alice'] });
    });
    it('gives the host role to the next player', async () => {
        const a = await client();
        const b = await client();
        await join(a, 'r', 'alice');
        await join(b, 'r', 'bob');
        const update = next<RoomUpdate>(b, 'roomUpdate');
        a.disconnect();
        expect(await update).toEqual({ host: 'bob', players: ['bob'] });
    });
    it('deletes the room when the last player leaves', async () => {
        const a = await client();
        await join(a, 'r', 'alice');
        a.disconnect();
        await expect.poll(() => server.rooms.has('r')).toBe(false);
    });
    it('ignores connections that never joined', async () => {
        const a = await client();
        a.disconnect();
        expect(await join(await client(), 'r', 'alice')).toEqual({ host: 'alice', players: ['alice'] });
    });
    describe('startGame', () => {
        it('starts the round for everyone when the host starts', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next<{ pieces: string[] }>(b, 'gameStarted');
            a.emit('startGame');
            const { pieces } = await started;
            expect([...pieces].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
        });
        it('ignores startGame from a player who is not the host', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const error = next<string>(b, 'joinError');
            b.emit('startGame');
            b.emit('joinRoom', { room: 'r', player: 'bob' });
            await error;
            expect(server.rooms.get('r')?.started).toBe(false);
        });
    });
    describe('lost', () => {
        it('tells the room who is out and who won', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next(a, 'gameStarted');
            a.emit('startGame');
            await started;
            const out = next<{ name: string }>(a, 'playerOut');
            const over = next<{ winner: string | null; lost: string[] }>(a, 'gameOver');
            b.emit('lost');
            expect(await out).toEqual({ name: 'bob' });
            expect(await over).toEqual({ winner: 'alice', lost: ['bob'] });
        });
        it('ends the round when the opponent disconnects', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next(a, 'gameStarted');
            a.emit('startGame');
            await started;
            const over = next<{ winner: string | null; lost: string[] }>(a, 'gameOver');
            b.disconnect();
            expect(await over).toEqual({ winner: 'alice', lost: [] });
        });
    });
    describe('requestPieces', () => {
        it('sends the next pieces to the player who asks', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next(b, 'gameStarted');
            a.emit('startGame');
            await started;
            const answer = next<{ pieces: string[] }>(b, 'pieces');
            b.emit('requestPieces', { from: 7 });
            const { pieces } = await answer;
            expect([...pieces].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
        });
        it('ignores a request far ahead of the dealt pieces', async () => {
            const a = await client();
            await join(a, 'r', 'alice');
            const started = next(a, 'gameStarted');
            a.emit('startGame');
            await started;
            const error = next<string>(a, 'joinError');
            a.emit('requestPieces', { from: 1000000 });
            a.emit('joinRoom', { room: 'r', player: 'alice' });
            await error;
            expect(server.rooms.get('r')?.piece.types.length).toBe(7);
        });
    });
    describe('boardChanged', () => {
        const heights = [0, 2, 5, 5, 3, 0, 0, 1, 4, 20];
    
        it('sends a spectrum to the other players', async () => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next(b, 'gameStarted');
            a.emit('startGame');
            await started;
            const seen = next<{ name: string; spectrum: number[] }>(a, 'spectrum');
            b.emit('boardChanged', { spectrum: heights });
            expect(await seen).toEqual({ name: 'bob', spectrum: heights });
        });
        it.each([
            ['too few columns', [0, 2, 5]],
            ['a column above the board', [0, 2, 5, 5, 3, 0, 0, 1, 4, 21]],
            ['a negative height', [0, 2, 5, 5, 3, 0, 0, 1, 4, -1]],
            ['a fraction', [0, 2.5, 5, 5, 3, 0, 0, 1, 4, 2]],
            ['not an array', 'hello'],
        ])('ignores a spectrum with %s', async (_, bad) => {
            const a = await client();
            const b = await client();
            await join(a, 'r', 'alice');
            await join(b, 'r', 'bob');
            const started = next(b, 'gameStarted');
            a.emit('startGame');
            await started;
            const seen = next<{ name: string; spectrum: number[] }>(a, 'spectrum');
            b.emit('boardChanged', { spectrum: bad });
            b.emit('boardChanged', { spectrum: heights });
            expect(await seen).toEqual({ name: 'bob', spectrum: heights });
        });
    });
    describe('linesCleared', () => {
        type Penalty = { lines: number; from: string };
    
        const startRound = async (names: string[]) => {
            const sockets = [];
            for (const name of names) {
                const socket = await client();
                await join(socket, 'r', name);
                sockets.push(socket);
            }
            const started = next(sockets[0], 'gameStarted');
            sockets[0].emit('startGame');
            await started;
            return sockets;
        };
    
        it('sends count - 1 red lines to each opponent', async () => {
            const [a, b, c] = await startRound(['alice', 'bob', 'sara']);
            const toAlice = next<Penalty>(a, 'penalty');
            const toSara = next<Penalty>(c, 'penalty');
            b.emit('linesCleared', { count: 3 });
            expect(await toAlice).toEqual({ lines: 2, from: 'bob' });
            expect(await toSara).toEqual({ lines: 2, from: 'bob' });
        });
        it('sends nothing for a single line', async () => {
            const [a, b] = await startRound(['alice', 'bob']);
            const first = next<Penalty>(a, 'penalty');
            b.emit('linesCleared', { count: 1 });
            b.emit('linesCleared', { count: 2 });
            expect(await first).toEqual({ lines: 1, from: 'bob' });
        });
        it.each([0, 5, 2.5, 'x'])('ignores a count of %s', async (bad) => {
            const [a, b] = await startRound(['alice', 'bob']);
            const first = next<Penalty>(a, 'penalty');
            b.emit('linesCleared', { count: bad });
            b.emit('linesCleared', { count: 2 });
            expect(await first).toEqual({ lines: 1, from: 'bob' });
        });
    });
});
