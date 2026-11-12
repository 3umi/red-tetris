import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as joinPath } from 'node:path';
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
    const clientDir = mkdtempSync(joinPath(tmpdir(), 'red-tetris-client-'));
    writeFileSync(joinPath(clientDir, 'index.html'), '<title>Red Tetris</title><div id="root"></div>');
    writeFileSync(joinPath(clientDir, 'bundle.js'), 'console.log("bundle")');
    server = createApp({ clientDir });
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
    it('serves the app for a room URL', async () => {
        const res = await fetch(`${url}/room/alice`);
        expect(await res.text()).toContain('<div id="root">');
    });
    it('serves the bundle', async () => {
        const res = await fetch(`${url}/bundle.js`);
        expect(await res.text()).toContain('bundle');
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
});
