import { configureStore, combineReducers, type Middleware } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import room from './roomSlice';
import game from './gameSlice';
import scores, { leaderboardLoaded } from './scoresSlice';
import { createSocketMiddleware, type GameSocket } from './socketMiddleware';
import { createScoreMiddleware, LEADERBOARD_SIZE } from './scoreMiddleware';
import { createScoreBook, browserStorage, type ScoreBook } from '../scores/scoreBook';

export const rootReducer = combineReducers({ room, game, scores });
export type RootState = ReturnType<typeof rootReducer>;

type StoreOptions = {
    connect?: () => GameSocket;
    preloadedState?: Partial<RootState>;
    scoreBook?: ScoreBook;
};

export const createStore = ({
    connect = () => io(),
    preloadedState,
    scoreBook = createScoreBook(browserStorage()),
}: StoreOptions = {}) => {
    const store = configureStore({
        reducer: rootReducer,
        preloadedState,
        middleware: (getDefault) => getDefault().concat(
            createSocketMiddleware(connect) as Middleware,
            createScoreMiddleware(scoreBook) as Middleware,
        ),
    });
    store.dispatch(leaderboardLoaded(scoreBook.top(LEADERBOARD_SIZE)));
    return store;
};

export type AppStore = ReturnType<typeof createStore>;
export type AppDispatch = AppStore['dispatch'];
