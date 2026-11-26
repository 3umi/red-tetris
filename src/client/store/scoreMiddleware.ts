import type { Middleware } from '@reduxjs/toolkit';
import type { ScoreBook } from '../scores/scoreBook';
import type { GameState } from '../game/engine';
import { joinRequested, roundOver, type RoomState } from './roomSlice';
import { recordLoaded, roundRecorded, leaderboardLoaded } from './scoresSlice';

type State = { room: RoomState; game: GameState };

// How many players the home page lists.
export const LEADERBOARD_SIZE = 5;

// Saves each round's score when the server says the round is over, and loads the
// player's record when they join a room.
export const createScoreMiddleware = (book: ScoreBook): Middleware<object, State> => (store) => (next) => (action) => {
    const result = next(action);
    if (joinRequested.match(action)) {
        store.dispatch(recordLoaded(book.get(action.payload.player)));
    } else if (roundOver.match(action)) {
        const { room: { me }, game } = store.getState();
        // A player who never got to play this round has nothing to save.
        if (me && game.status !== 'idle') {
            const previousBest = book.get(me)?.best ?? 0;
            const record = book.record(me, { score: game.score, won: action.payload.winner === me });
            store.dispatch(roundRecorded({ record, newBest: game.score > previousBest }));
            store.dispatch(leaderboardLoaded(book.top(LEADERBOARD_SIZE)));
        }
    }
    return result;
};
