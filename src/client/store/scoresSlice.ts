import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PlayerRecord } from '../scores/scoreBook';
import { roundStarted } from './roomSlice';

export type ScoresState = {
    // The current player's saved record, if they have played before.
    mine: PlayerRecord | null;
    // Whether the round that just ended beat the player's previous best.
    newBest: boolean;
    // The best scores saved on this device, for the home page.
    top: PlayerRecord[];
};

export const initialScores: ScoresState = { mine: null, newBest: false, top: [] };

const scoresSlice = createSlice({
    name: 'scores',
    initialState: initialScores,
    reducers: {
        recordLoaded: (state, action: PayloadAction<PlayerRecord | null>) => ({ ...state, mine: action.payload, newBest: false }),
        roundRecorded: (state, action: PayloadAction<{ record: PlayerRecord; newBest: boolean }>) =>
            ({ ...state, mine: action.payload.record, newBest: action.payload.newBest }),
        leaderboardLoaded: (state, action: PayloadAction<PlayerRecord[]>) => ({ ...state, top: action.payload }),
    },
    extraReducers: (builder) => {
        builder.addCase(roundStarted, (state) => ({ ...state, newBest: false }));
    },
});

export const { recordLoaded, roundRecorded, leaderboardLoaded } = scoresSlice.actions;
export default scoresSlice.reducer;
