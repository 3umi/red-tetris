import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Phase = 'joining' | 'lobby' | 'playing' | 'over';
export type OpponentStatus = 'playing' | 'out' | 'winner';

export type Opponent = {
    name: string;
    status: OpponentStatus;
    spectrum: number[];
};

export type RoomState = {
    room: string | null;
    me: string | null;
    host: string | null;
    players: string[];
    phase: Phase;
    error: string | null;
    opponents: Record<string, Opponent>;
    // Names in the order they were knocked out, first out first.
    outOrder: string[];
    winner: string | null;
};

export const initialRoom: RoomState = {
    room: null,
    me: null,
    host: null,
    players: [],
    phase: 'joining',
    error: null,
    opponents: {},
    outOrder: [],
    winner: null,
};

const emptySpectrum = (): number[] => Array(10).fill(0);

const roomSlice = createSlice({
    name: 'room',
    initialState: initialRoom,
    reducers: {
        joinRequested: (_state, action: PayloadAction<{ room: string; player: string }>) => ({
            ...initialRoom,
            room: action.payload.room,
            me: action.payload.player,
        }),
        joinFailed: (state, action: PayloadAction<string>) => ({ ...state, error: action.payload }),
        roomUpdated: (state, action: PayloadAction<{ host: string; players: string[] }>) => ({
            ...state,
            host: action.payload.host,
            players: action.payload.players,
            phase: state.phase === 'joining' ? 'lobby' : state.phase,
            opponents: Object.fromEntries(action.payload.players
                .filter((name) => name !== state.me)
                .map((name) => [name, state.opponents[name] ?? { name, status: 'playing', spectrum: emptySpectrum() }])),
        }),
        startRequested: (state) => state,
        roundStarted: (state) => ({
            ...state,
            phase: 'playing',
            outOrder: [],
            winner: null,
            opponents: Object.fromEntries(Object.values(state.opponents)
                .map((opponent) => [opponent.name, { ...opponent, status: 'playing', spectrum: emptySpectrum() }])),
        }),
        spectrumUpdated: (state, action: PayloadAction<{ name: string; spectrum: number[] }>) => {
            const opponent = state.opponents[action.payload.name];
            return opponent
                ? { ...state, opponents: { ...state.opponents, [opponent.name]: { ...opponent, spectrum: action.payload.spectrum } } }
                : state;
        },
        playerOut: (state, action: PayloadAction<string>) => {
            const opponent = state.opponents[action.payload];
            const outOrder = state.outOrder.includes(action.payload) ? state.outOrder : [...state.outOrder, action.payload];
            return {
                ...state,
                outOrder,
                opponents: opponent ? { ...state.opponents, [opponent.name]: { ...opponent, status: 'out' } } : state.opponents,
            };
        },
        roundOver: (state, action: PayloadAction<{ winner: string | null; lost: string[] }>) => {
            const { winner, lost } = action.payload;
            const opponent = winner ? state.opponents[winner] : undefined;
            return {
                ...state,
                phase: 'over',
                winner,
                // The server's list is complete, even for a client that missed a playerOut.
                outOrder: lost,
                opponents: opponent ? { ...state.opponents, [opponent.name]: { ...opponent, status: 'winner' } } : state.opponents,
            };
        },
        left: () => initialRoom,
    },
});

export const {
    joinRequested, joinFailed, roomUpdated, startRequested, roundStarted, spectrumUpdated,
    playerOut, roundOver, left,
} = roomSlice.actions;
export default roomSlice.reducer;
