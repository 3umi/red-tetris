// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { App } from '../../src/client/App';
import { createStore, type RootState } from '../../src/client/store';
import { initialRoom } from '../../src/client/store/roomSlice';
import { initialGame } from '../../src/client/game/engine';
import { GameOver } from '../../src/client/pages/GameOver';
import { PixelArt } from '../../src/client/components/PixelArt';
import { Spectrum } from '../../src/client/components/Spectrum';
import { Board } from '../../src/client/components/Board';
import { FALL_INTERVAL_MS } from '../../src/client/hooks/hooks';
import { createBoard } from '../../src/shared/board';
import { fakeConnections } from './fakeSocket';
import { createScoreBook, type ScoreBook } from '../../src/client/scores/scoreBook';

afterEach(() => {
    cleanup();
    vi.useRealTimers();
});

const Location = () => <div data-testid="location">{useLocation().pathname}</div>;

const renderApp = (path: string, options: { preloadedState?: Partial<RootState>; scoreBook?: ScoreBook } = {}) => {
    const connections = fakeConnections();
    // A fresh in-memory score book, so saved scores never leak between tests.
    const store = createStore({ connect: connections.connect, scoreBook: createScoreBook(null), ...options });
    render(
        <Provider store={store}>
            <MemoryRouter initialEntries={[path]}>
                <App />
                <Location />
            </MemoryRouter>
        </Provider>,
    );
    return { store, connections };
};

const key = (name: string) => act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: name }));
});

describe('home', () => {
    it('enables Join room once both fields are filled, and opens the room URL', () => {
        renderApp('/');
        const join = screen.getByRole('button', { name: 'Join room' });
        expect(join).toHaveProperty('disabled', true);
        fireEvent.change(screen.getByLabelText('Room'), { target: { value: 'pelicans' } });
        fireEvent.change(screen.getByLabelText('Your name'), { target: { value: ' oumaima ' } });
        expect(join).toHaveProperty('disabled', false);
        fireEvent.click(join);
        expect(screen.getByTestId('location').textContent).toBe('/pelicans/oumaima');
    });
    it('does nothing when submitted empty', () => {
        renderApp('/');
        fireEvent.submit(screen.getByRole('button', { name: 'Join room' }));
        expect(screen.getByTestId('location').textContent).toBe('/');
    });
    it('shows the home page for unknown URLs', () => {
        renderApp('/a/b/c');
        expect(screen.getByRole('button', { name: 'Join room' })).toBeTruthy();
    });
});

describe('room', () => {
    const joinAsHost = (options = {}) => {
        const app = renderApp('/pelicans/oumaima', options);
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] }));
        return { ...app, server };
    };

    it('joins the room from the URL and shows the lobby', () => {
        const { server } = joinAsHost();
        expect(server.sent('joinRoom')).toEqual([{ room: 'pelicans', player: 'oumaima' }]);
        expect(screen.getByRole('heading', { name: 'pelicans' })).toBeTruthy();
        const players = within(screen.getByRole('list', { name: 'Players' }));
        expect(players.getByText('Host, you')).toBeTruthy();
        expect(players.getByText('sara')).toBeTruthy();
        expect(screen.getByText('Waiting for oumaima to start')).toBeTruthy();
    });
    it('only lets the host start', () => {
        const app = renderApp('/pelicans/sara');
        act(() => app.connections.last().serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(screen.getByRole('button', { name: 'Start game' })).toHaveProperty('disabled', true);
        expect(screen.getByText('You')).toBeTruthy();
    });
    it('shows the home page with the error when joining fails', () => {
        const app = renderApp('/pelicans/oumaima');
        act(() => app.connections.last().serverSends('joinError', 'Error: oumaima name already exists in pelicans'));
        expect(screen.getByRole('alert').textContent).toContain('already exists');
    });
    it('plays a round: start, move with the keyboard, fall, and see opponents', () => {
        vi.useFakeTimers();
        const { store, server } = joinAsHost();
        fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
        expect(server.sent('startGame')).toHaveLength(1);

        act(() => server.serverSends('gameStarted', { pieces: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'] }));
        expect(screen.getByText('2 of 2 still playing')).toBeTruthy();
        expect(screen.getByText('sara')).toBeTruthy();
        expect(store.getState().game.piece).toMatchObject({ type: 'T', x: 3, y: 0 });

        key('ArrowLeft');
        key('ArrowRight');
        key('ArrowRight');
        key('ArrowUp');
        key('ArrowDown');
        key('Enter');
        expect(store.getState().game.piece).toMatchObject({ x: 4, y: 1 });

        act(() => {
            vi.advanceTimersByTime(FALL_INTERVAL_MS * 2);
        });
        expect(store.getState().game.piece?.y).toBe(3);

        key(' ');
        expect(store.getState().game.locks).toBe(1);
        expect(server.sent('boardChanged')).toHaveLength(1);

        act(() => server.serverSends('penalty', { lines: 2, from: 'sara' }));
        expect(screen.getByLabelText('Red lines under you').textContent).toBe('2');
        expect(screen.getByText('Last sent by sara')).toBeTruthy();

        act(() => server.serverSends('spectrum', { name: 'sara', spectrum: [20, 0, 0, 0, 0, 0, 0, 0, 0, 0] }));
        expect(screen.getByLabelText('Column heights 20 0 0 0 0 0 0 0 0 0')).toBeTruthy();
    });
    it('shows "You win" to the winner, and the host restarts with startGame', () => {
        const { server } = joinAsHost();
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        act(() => server.serverSends('playerOut', { name: 'sara' }));
        act(() => server.serverSends('gameOver', { winner: 'oumaima', lost: ['sara'] }));
        expect(screen.getByRole('heading', { name: 'You win' })).toBeTruthy();
        expect(screen.getByText('You finished 1st of 2')).toBeTruthy();
        expect(screen.getByText('2nd')).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Restart game' }));
        expect(server.sent('startGame')).toHaveLength(1);
        act(() => server.serverSends('gameStarted', { pieces: ['O'] }));
        expect(screen.getByText('2 of 2 still playing')).toBeTruthy();
    });
    it('keeps places right when someone joins after the round', () => {
        const { server } = joinAsHost();
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        act(() => server.serverSends('gameOver', { winner: 'sara', lost: ['oumaima'] }));
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara', 'yasmine'] }));
        expect(screen.getByText('You finished 2nd of 2')).toBeTruthy();
        expect(screen.getByText('Joined')).toBeTruthy();
    });
    it('keeps the still-playing count right when a player who lost leaves', () => {
        const app = renderApp('/pelicans/oumaima');
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara', 'adam'] }));
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        act(() => server.serverSends('playerOut', { name: 'adam' }));
        expect(screen.getByText('2 of 3 still playing')).toBeTruthy();
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(screen.getByText('2 of 2 still playing')).toBeTruthy();
    });
    it('shows the win when the only opponent disconnects mid-round', () => {
        const { server } = joinAsHost();
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima'] }));
        act(() => server.serverSends('gameOver', { winner: 'oumaima', lost: [] }));
        expect(screen.getByRole('heading', { name: 'You win' })).toBeTruthy();
        expect(screen.getByText('You finished 1st of 2')).toBeTruthy();
        expect(screen.getByText('Left')).toBeTruthy();
    });
    it('still lists a player who lost and then left on the game-over screen', () => {
        const app = renderApp('/pelicans/oumaima');
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara', 'adam'] }));
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        act(() => server.serverSends('playerOut', { name: 'adam' }));
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] }));
        act(() => server.serverSends('gameOver', { winner: 'sara', lost: ['adam', 'oumaima'] }));
        expect(screen.getByText('You finished 2nd of 3')).toBeTruthy();
        expect(screen.getByText('3rd')).toBeTruthy();
    });
    it('leaves the room and goes home', () => {
        const { server } = joinAsHost();
        act(() => server.serverSends('gameStarted', { pieces: ['T'] }));
        fireEvent.click(screen.getByRole('button', { name: 'Leave game' }));
        expect(screen.getByTestId('location').textContent).toBe('/');
        expect(server.state.connected).toBe(false);
    });
    it('plays a solo round to the end', () => {
        const app = renderApp('/solo/me');
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'me', players: ['me'] }));
        fireEvent.click(screen.getByRole('button', { name: 'Start game' }));
        act(() => server.serverSends('gameStarted', { pieces: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'] }));
        expect(screen.getByText('1 of 1 still playing')).toBeTruthy();
        key(' ');
        act(() => server.serverSends('gameOver', { winner: null, lost: ['me'] }));
        expect(screen.getByRole('heading', { name: 'Game over' })).toBeTruthy();
        expect(screen.getByText('You placed 1 piece')).toBeTruthy();
    });
});

describe('game over', () => {
    const over = (me: string, winner: string | null) => {
        const store = createStore({
            scoreBook: createScoreBook(null),
            preloadedState: {
                room: {
                    ...initialRoom, room: 'pelicans', me, host: 'oumaima', phase: 'over', winner,
                    players: ['oumaima', 'sara', 'adam'], outOrder: ['adam', 'oumaima'],
                    opponents: {
                        sara: { name: 'sara', status: 'winner', spectrum: Array(10).fill(1) },
                        adam: { name: 'adam', status: 'out', spectrum: Array(10).fill(9) },
                    },
                },
                game: { ...initialGame, status: 'lost' },
            },
        });
        render(<Provider store={store}><MemoryRouter><Routes><Route path="*" element={<GameOver />} /></Routes></MemoryRouter></Provider>);
    };
    it('names the winner and my place', () => {
        over('oumaima', 'sara');
        expect(screen.getByRole('heading', { name: 'sara wins' })).toBeTruthy();
        expect(screen.getByText('You finished 2nd of 3')).toBeTruthy();
        expect(screen.getByText('Winner')).toBeTruthy();
        expect(screen.getByText('3rd')).toBeTruthy();
    });
    it('says when nobody won', () => {
        over('oumaima', null);
        expect(screen.getByRole('heading', { name: 'No winner' })).toBeTruthy();
    });
    it('only lets the host restart', () => {
        over('adam', 'sara');
        expect(screen.getByRole('button', { name: 'Restart game' })).toHaveProperty('disabled', true);
    });
});

describe('scores', () => {
    const playedBefore = () => {
        const book = createScoreBook(null);
        book.record('oumaima', { score: 1200, won: true });
        book.record('sara', { score: 4800, won: false });
        return book;
    };

    it('lists the best scores on this device on the home page', () => {
        renderApp('/', { scoreBook: playedBefore() });
        const list = within(screen.getByRole('list', { name: 'Best scores' }));
        expect(list.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['sara4,800', 'oumaima1,200']);
    });
    it('shows no list before anyone has scored', () => {
        renderApp('/');
        expect(screen.queryByRole('list', { name: 'Best scores' })).toBe(null);
    });
    it('shows my record in the lobby, my score while playing, and a new best at the end', () => {
        const app = renderApp('/pelicans/oumaima', { scoreBook: playedBefore() });
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'oumaima', players: ['oumaima', 'sara'] }));
        expect(screen.getByText('Best 1,200 · 1 round · 1 win')).toBeTruthy();

        act(() => server.serverSends('gameStarted', { pieces: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'] }));
        expect(screen.getByLabelText('Score').textContent).toBe('0');
        expect(screen.getByText('Your best 1,200')).toBeTruthy();
        key(' ');
        const score = app.store.getState().game.score;
        expect(screen.getByLabelText('Score').textContent).toBe(String(score));
        expect(screen.getByLabelText('Lines').textContent).toBe('0');

        act(() => server.serverSends('gameOver', { winner: 'sara', lost: ['oumaima'] }));
        expect(screen.getByText(`Score ${score}`)).toBeTruthy();
        expect(screen.queryByText('New best')).toBe(null);
        expect(screen.getByText('Best 1,200')).toBeTruthy();
    });
    it('marks a new best on the game-over screen', () => {
        const app = renderApp('/solo/newcomer');
        const server = app.connections.last();
        act(() => server.serverSends('roomUpdate', { host: 'newcomer', players: ['newcomer'] }));
        act(() => server.serverSends('gameStarted', { pieces: ['T', 'O', 'I', 'S', 'Z', 'J', 'L', 'T'] }));
        key(' ');
        act(() => server.serverSends('gameOver', { winner: null, lost: ['newcomer'] }));
        expect(screen.getByText('New best')).toBeTruthy();
    });
});

describe('drawing', () => {
    it('draws one square per pixel, coloured from the palette', () => {
        const { container } = render(<PixelArt art={{ palette: ['#ff0000'], rows: ['a.', '.a'] }} cell={2} />);
        const squares = container.querySelectorAll('.pixel-art span');
        expect(squares).toHaveLength(4);
        expect((squares[0] as HTMLElement).style.background).toBe('rgb(255, 0, 0)');
        expect((squares[1] as HTMLElement).style.background).toBe('');
    });
    it('draws spectrum bars as a share of the board height', () => {
        const { container } = render(<Spectrum heights={[10, 20, 0]} />);
        const bars = [...container.querySelectorAll('.spectrum span')].map((bar) => (bar as HTMLElement).style.height);
        expect(bars).toEqual(['50%', '100%', '0%']);
    });
    it('draws the falling piece over the board without tables', () => {
        const { container } = render(<Board board={createBoard()} piece={{ type: 'O', shape: [[1, 1], [1, 1]], x: 0, y: 0 }} />);
        expect(container.querySelectorAll('.cell')).toHaveLength(200);
        expect(container.querySelectorAll('.cell-2')).toHaveLength(4);
        expect(container.querySelector('table')).toBe(null);
    });
});
