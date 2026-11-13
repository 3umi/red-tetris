import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { createStore, type RootState } from './store';
import { initialRoom, type Opponent } from './store/roomSlice';
import { initialGame } from './game/engine';
import { Lobby } from './pages/Lobby';
import { Game } from './pages/Game';
import { GameOver } from './pages/GameOver';
import { Home } from './pages/Home';
import { createScoreBook } from './scores/scoreBook';

// DEVELOPMENT ONLY: renders each screen with the example data from Design.pdf, so the
// screens can be compared with the design without a full multiplayer round.
// Open /__preview/lobby, /__preview/game or /__preview/over on the Vite dev server.

const board = (rows: string[]) => rows.map((row) => [...row].map(Number));

const GAME_BOARD = board([
    '0000000000', '0000000000', '0000000000', '0000000000', '0000000000', '0000000000', '0000000000',
    '0000000000', '0000000000', '0000000000', '0000000000', '0000000000', '0000000070', '6000004070',
    '6660004477', '3550220411', '3355226611', '3111177602', '8888888888', '8888888888',
]);

const OVER_BOARD = board([
    '0000220000', '0005220000', '0055077000', '0050070000', '6600070440', '6000110440', '6033300400',
    '7703004401', '0705504001', '0755220001', '6000223301', '6660111130', '4405507773', '0440557033',
    '2201111063', '8888888888', '8888888888', '8888888888', '8888888888', '8888888888',
]);

// Example records, kept in memory so the preview never touches real saved scores.
const exampleBook = () => {
    const book = createScoreBook(null);
    [['sara', 4820, true], ['oumaima', 3260, true], ['adam', 2140, false], ['youssef', 980, false]]
        .forEach(([name, score, won]) => book.record(name as string, { score: score as number, won: won as boolean }));
    book.record('oumaima', { score: 1200, won: false });
    return book;
};
const mine = { name: 'oumaima', best: 3260, rounds: 2, wins: 1 };

const opponent = (name: string, status: Opponent['status'], spectrum: number[]): [string, Opponent] =>
    [name, { name, status, spectrum }];

const room = {
    ...initialRoom,
    room: 'pelicans',
    me: 'oumaima',
    host: 'oumaima',
    players: ['oumaima', 'sara', 'adam', 'youssef'],
};

const states: Record<string, Partial<RootState>> = {
    home: {},
    lobby: { room: { ...room, phase: 'lobby' }, scores: { mine, newBest: false, top: [] } },
    game: {
        room: {
            ...room,
            phase: 'playing',
            roster: room.players,
            outOrder: ['youssef'],
            opponents: Object.fromEntries([
                opponent('sara', 'playing', [6, 7, 7, 5, 4, 6, 8, 7, 5, 4]),
                opponent('adam', 'playing', [9, 11, 12, 10, 9, 8, 10, 12, 13, 11]),
                opponent('youssef', 'out', [18, 19, 20, 19, 17, 18, 19, 20, 18, 16]),
            ]),
        },
        game: {
            ...initialGame,
            status: 'lost',
            board: GAME_BOARD,
            piece: { type: 'T', shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], x: 3, y: 5 },
            penalty: 2,
            lastPenaltyFrom: 'adam',
            score: 2340,
            lines: 9,
        },
        scores: { mine, newBest: false, top: [] },
    },
    over: {
        room: {
            ...room,
            phase: 'over',
            roster: room.players,
            outOrder: ['youssef', 'adam', 'oumaima'],
            winner: 'sara',
            opponents: Object.fromEntries([
                opponent('sara', 'winner', [4, 5, 5, 3, 2, 4, 6, 5, 3, 2]),
                opponent('adam', 'out', [14, 15, 17, 16, 13, 14, 15, 16, 17, 14]),
                opponent('youssef', 'out', [16, 17, 18, 17, 15, 16, 17, 18, 16, 14]),
            ]),
        },
        game: { ...initialGame, status: 'lost', board: OVER_BOARD, score: 3620, lines: 14 },
        scores: { mine: { ...mine, best: 3620, rounds: 3 }, newBest: true, top: [] },
    },
};

const SCREENS = { home: () => <Home />, lobby: Lobby, game: () => <Game onLeave={() => undefined} />, over: GameOver };

export const Preview = ({ screen }: { screen: string }) => {
    const Screen = SCREENS[screen as keyof typeof SCREENS] ?? Lobby;
    const store = createStore({ preloadedState: states[screen] ?? states.lobby, scoreBook: exampleBook() });
    return (
        <Provider store={store}>
            <MemoryRouter>
                <Screen />
            </MemoryRouter>
        </Provider>
    );
};
