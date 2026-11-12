import { configureStore, combineReducers, type Middleware } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import room from './roomSlice';
import game from './gameSlice';
import { createSocketMiddleware, type GameSocket } from './socketMiddleware';
import { localDealer } from './localDealer';

export const rootReducer = combineReducers({ room, game });
export type RootState = ReturnType<typeof rootReducer>;

type StoreOptions = {
    connect?: () => GameSocket;
    // Deal pieces in the browser instead of waiting for the server (see localDealer).
    dealLocally?: boolean;
    preloadedState?: Partial<RootState>;
};

export const createStore = ({ connect = () => io(), dealLocally = true, preloadedState }: StoreOptions = {}) =>
    configureStore({
        reducer: rootReducer,
        preloadedState,
        middleware: (getDefault) => getDefault().concat(
            [createSocketMiddleware(connect), ...(dealLocally ? [localDealer(Math.random)] : [])] as Middleware[],
        ),
    });

export type AppStore = ReturnType<typeof createStore>;
export type AppDispatch = AppStore['dispatch'];
