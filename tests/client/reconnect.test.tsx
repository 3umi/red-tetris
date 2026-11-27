// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { App } from '../../src/client/App';
import { createStore } from '../../src/client/store';
import { joinRequested, left, CONNECTION_LOST } from '../../src/client/store/roomSlice';
import { createScoreBook } from '../../src/client/scores/scoreBook';
import { fakeConnections } from './fakeSocket';

afterEach(cleanup);

const PIECES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L', 'I'];

const setup = () => {
    const connections = fakeConnections();
    const store = createStore({ connect: connections.connect, scoreBook: createScoreBook(null) });
    store.dispatch(joinRequested({ room: 'pelicans', player: 'alice' }));
    const server = connections.last();
    server.serverSends('roomUpdate', { host: 'alice', players: ['alice', 'bob'] });
    return { store, server, connections };
};

describe('losing the connection', () => {
    it('says the connection is lost and stops the game', () => {
        const { store, server } = setup();
        server.serverSends('gameStarted', { pieces: PIECES });
        server.serverSends('disconnect', 'transport close');
        expect(store.getState().room.error).toBe(CONNECTION_LOST);
        expect(store.getState().game.status).toBe('idle');
    });
    it('joins the same room again once reconnected, on the same socket', () => {
        const { store, server, connections } = setup();
        server.serverSends('gameStarted', { pieces: PIECES });
        server.serverSends('disconnect', 'transport close');
        server.serverSends('connect');
        expect(connections.sockets).toHaveLength(1);
        expect(server.sent('joinRoom')).toEqual([
            { room: 'pelicans', player: 'alice' },
            { room: 'pelicans', player: 'alice' },
        ]);
        // Back to joining: the old round, players and error are gone until the server answers.
        expect(store.getState().room).toMatchObject({ room: 'pelicans', me: 'alice', phase: 'joining', error: null, players: [] });
        server.serverSends('roomUpdate', { host: 'alice', players: ['alice'] });
        expect(store.getState().room.phase).toBe('lobby');
    });
    it('shows the server\'s answer when the room refuses the new join', () => {
        const { store, server } = setup();
        server.serverSends('disconnect', 'ping timeout');
        server.serverSends('connect');
        server.serverSends('joinError', 'Error: pelicans has already started');
        expect(store.getState().room.error).toBe('Error: pelicans has already started');
    });
    it('reconnects by hand when the server closed the connection', () => {
        const { server } = setup();
        server.state.connected = false;
        server.serverSends('disconnect', 'io server disconnect');
        expect(server.state.connected).toBe(true);
    });
    it('does nothing when the client closed the connection itself', () => {
        const { store, server } = setup();
        store.dispatch(left());
        server.serverSends('disconnect', 'io client disconnect');
        server.serverSends('connect');
        expect(store.getState().room.error).toBe(null);
        expect(server.sent('joinRoom')).toHaveLength(1);
    });
    it('does not join again after the room already refused this page', () => {
        const { store, server } = setup();
        server.serverSends('joinError', 'Error: alice name already exists in pelicans');
        server.serverSends('disconnect', 'transport close');
        server.serverSends('connect');
        expect(store.getState().room.error).toBe('Error: alice name already exists in pelicans');
        expect(server.sent('joinRoom')).toHaveLength(1);
    });
});

describe('the room page', () => {
    it('shows the home page with the message while offline, and the lobby once back', () => {
        const connections = fakeConnections();
        const store = createStore({ connect: connections.connect, scoreBook: createScoreBook(null) });
        render(
            <Provider store={store}>
                <MemoryRouter initialEntries={['/pelicans/alice']}>
                    <App />
                </MemoryRouter>
            </Provider>,
        );
        const server = connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'alice', players: ['alice'] }));
        expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy();

        act(() => server.serverSends('disconnect', 'transport close'));
        expect(screen.getByRole('alert').textContent).toBe(CONNECTION_LOST);

        act(() => {
            server.serverSends('connect');
            server.serverSends('roomUpdate', { host: 'alice', players: ['alice'] });
        });
        expect(screen.queryByRole('alert')).toBe(null);
        expect(screen.getByRole('button', { name: 'Start game' })).toBeTruthy();
    });
});
