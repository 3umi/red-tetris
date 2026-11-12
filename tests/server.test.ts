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
});
