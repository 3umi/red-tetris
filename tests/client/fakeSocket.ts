import type { GameSocket } from '../../src/client/store/socketMiddleware';

type Handler = (...args: unknown[]) => void;

// A stand-in for a socket.io client: records what the client emits, and lets a test
// play the server's side with `serverSends`.
export const createFakeSocket = () => {
    const handlers = new Map<string, Handler[]>();
    const emitted: { event: string; data: unknown }[] = [];
    const state = { connected: true };

    const socket = {
        on: (event: string, handler: Handler) => {
            handlers.set(event, [...(handlers.get(event) ?? []), handler]);
            return socket;
        },
        emit: (event: string, data?: unknown) => {
            emitted.push({ event, data });
            return socket;
        },
        disconnect: () => {
            state.connected = false;
            return socket;
        },
    };

    return {
        socket: socket as unknown as GameSocket,
        emitted,
        state,
        sent: (event: string) => emitted.filter((entry) => entry.event === event).map((entry) => entry.data),
        serverSends: (event: string, data?: unknown) => (handlers.get(event) ?? []).forEach((handler) => handler(data)),
    };
};

export type FakeSocket = ReturnType<typeof createFakeSocket>;

// A connect function that hands out a new fake socket each time and remembers them all.
export const fakeConnections = () => {
    const sockets: FakeSocket[] = [];
    const connect = () => {
        const fake = createFakeSocket();
        sockets.push(fake);
        return fake.socket;
    };
    return { sockets, connect, last: () => sockets[sockets.length - 1] };
};
