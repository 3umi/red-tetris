import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { PieceType } from '../../shared/pieces';
import * as engine from '../game/engine';

const gameSlice = createSlice({
    name: 'game',
    initialState: engine.initialGame,
    reducers: {
        started: (_state, action: PayloadAction<PieceType[]>) => engine.startGame(action.payload),
        piecesReceived: (state, action: PayloadAction<PieceType[]>) => engine.receivePieces(state, action.payload),
        ticked: (state) => engine.tick(state),
        movedLeft: (state) => engine.shift(state, -1),
        movedRight: (state) => engine.shift(state, 1),
        rotated: (state) => engine.rotate(state),
        softDropped: (state) => engine.softDrop(state),
        hardDropped: (state) => engine.drop(state),
        penaltyReceived: (state, action: PayloadAction<{ lines: number; from: string }>) =>
            engine.receivePenalty(state, action.payload.lines, action.payload.from),
        reset: () => engine.initialGame,
    },
});

export const {
    started, piecesReceived, ticked, movedLeft, movedRight, rotated, softDropped, hardDropped, penaltyReceived, reset,
} = gameSlice.actions;
export default gameSlice.reducer;
