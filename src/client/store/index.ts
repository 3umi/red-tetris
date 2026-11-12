import { configureStore, combineReducers, type Middleware } from '@reduxjs/toolkit';
import { io } from 'socket.io-client';
import room from './roomSlice';
import game from './gameSlice';
import { createSocketMiddleware, type GameSocket } from './socketMiddleware';

export const rootReducer = combineReducers({ room, game });
export type RootState = ReturnType<typeof rootReducer>;

type StoreOptions = {
    connect?: () => GameSocket;
    preloadedState?: Partial<RootState>;
};

export const createStore = ({ connect = () => io(), preloadedState }: StoreOptions = {}) =>
    configureStore({
        reducer: rootReducer,
        preloadedState,
        middleware: (getDefault) => getDefault().concat(createSocketMiddleware(connect) as Middleware),
    });

export type AppStore = ReturnType<typeof createStore>;
export type AppDispatch = AppStore['dispatch'];
