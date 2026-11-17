import { describe, it, expect } from 'vitest';
import {
    initialGame, startGame, receivePieces, tick, drop, shift, rotate, receivePenalty, softDrop, type GameState,
} from '../../src/client/game/engine';
import { createBoard, fullRow, penaltyRow, BOARD_HEIGHT } from '../../src/shared/board';
import { CELL } from '../../src/shared/pieces';
import { createPiece, hardDrop } from '../../src/shared/moves';

const fallTo = (state: GameState, y: number): GameState =>
    state.piece && state.piece.y < y ? fallTo(tick(state), y) : state;

describe('startGame', () => {
    it('spawns the first piece and keeps the rest queued', () => {
        const state = startGame(['T', 'O', 'I']);
        expect(state.status).toBe('playing');
        expect(state.piece?.type).toBe('T');
        expect(state.queue).toEqual(['O', 'I']);
    });
    it('waits for pieces when the queue is empty', () => {
        const state = startGame([]);
        expect(state.status).toBe('playing');
        expect(state.piece).toBe(null);
    });
});

describe('receivePieces', () => {
    it('spawns a piece when none is falling', () => {
        const state = receivePieces(startGame([]), ['L', 'J']);
        expect(state.piece?.type).toBe('L');
        expect(state.queue).toEqual(['J']);
    });
    it('only queues pieces while one is falling', () => {
        const state = receivePieces(startGame(['T']), ['L']);
        expect(state.piece?.type).toBe('T');
        expect(state.queue).toEqual(['L']);
    });
    it('does not spawn before the game starts', () => {
        expect(receivePieces(initialGame, ['L']).piece).toBe(null);
    });
});

describe('tick', () => {
    it('moves the piece down one row', () => {
        const state = startGame(['T']);
        expect(tick(state).piece?.y).toBe(1);
    });
    it('locks a piece that cannot fall and spawns the next one', () => {
        const resting = fallTo(startGame(['T', 'O']), 18);
        const state = tick(resting);
        expect(state.board[19][4]).toBe(CELL.T);
        expect(state.locks).toBe(1);
        expect(state.piece?.type).toBe('O');
    });
    it('gives one step to adjust after landing', () => {
        const landed = fallTo(startGame(['T', 'O']), 18);
        const moved = shift(landed, -1);
        const state = tick(moved);
        expect(state.board[19][3]).toBe(CELL.T);
        expect(state.board[19][6]).toBe(0);
    });
    it('records cleared lines', () => {
        const board = createBoard();
        board[19] = [...fullRow().slice(0, 3), 0, 0, 0, ...fullRow().slice(6)];
        const state = { ...startGame(['T', 'O']), board };
        const locked = tick(fallTo({ ...state, piece: { ...state.piece!, shape: [[0, 0, 0], [0, 0, 0], [1, 1, 1]] } }, 17));
        expect(locked.cleared).toBe(1);
        expect(locked.board[19].every((cell) => cell === 0)).toBe(true);
    });
    it('does nothing when no piece is falling', () => {
        expect(tick(initialGame)).toBe(initialGame);
    });
});

describe('drop', () => {
    it('locks the piece at the bottom at once', () => {
        const state = drop(startGame(['T', 'O']));
        expect(state.board[19][3]).toBe(CELL.T);
        expect(state.locks).toBe(1);
        expect(state.piece?.type).toBe('O');
    });
    it('does nothing when no piece is falling', () => {
        expect(drop(initialGame)).toBe(initialGame);
    });
});

describe('shift and rotate', () => {
    it('moves the piece sideways', () => {
        expect(shift(startGame(['T']), 1).piece?.x).toBe(4);
    });
    it('rotates the piece', () => {
        expect(rotate(startGame(['T'])).piece?.shape).toEqual([[0, 1, 0], [0, 1, 1], [0, 1, 0]]);
    });
    it('ignores input when the game is not running', () => {
        expect(shift(initialGame, 1)).toBe(initialGame);
        expect(rotate(initialGame)).toBe(initialGame);
    });
});

describe('losing', () => {
    it('is lost when a new piece cannot enter the board', () => {
        const board = createBoard();
        board[1][4] = 1;
        const state = receivePieces({ ...startGame([]), board }, ['T']);
        expect(state.status).toBe('lost');
        expect(state.piece).toBe(null);
    });
});

describe('receivePenalty', () => {
    it('adds red lines and remembers the sender', () => {
        const state = receivePenalty(startGame(['T']), 2, 'adam');
        expect(state.board[19]).toEqual(penaltyRow());
        expect(state.board[18]).toEqual(penaltyRow());
        expect(state.penalty).toBe(2);
        expect(state.lastPenaltyFrom).toBe('adam');
    });
    it('lifts the falling piece when the red lines reach it', () => {
        const low = fallTo(startGame(['T']), 18);
        const state = receivePenalty(low, 1, 'adam');
        expect(state.status).toBe('playing');
        expect(state.piece?.y).toBe(17);
    });
    it('is lost when blocks are pushed off the top', () => {
        const board = createBoard();
        board[0][0] = 1;
        const state = receivePenalty({ ...startGame([]), board }, 1, 'adam');
        expect(state.status).toBe('lost');
    });
    it('is lost when the falling piece has no room left', () => {
        // An O piece at the top, resting on a stack that reaches row 2. One red line pushes
        // the stack into the piece, and there is no row above it to lift the piece into.
        const board = Array.from({ length: BOARD_HEIGHT }, (_, row) => (row < 2 ? createBoard()[0] : [0, ...fullRow().slice(1)]));
        const state = receivePenalty({ ...startGame([]), board, piece: createPiece('O') }, 1, 'adam');
        expect(state.board[0].every((cell) => cell === 0)).toBe(true);
        expect(state.status).toBe('lost');
        expect(state.piece).toBe(null);
    });
    it('ignores zero lines and games that are not running', () => {
        const state = startGame(['T']);
        expect(receivePenalty(state, 0, 'adam')).toBe(state);
        expect(receivePenalty(initialGame, 2, 'adam')).toBe(initialGame);
    });
});

describe('score', () => {
    // A board with the bottom `rows` rows full except the last column, and a vertical I
    // above that column, so a hard drop clears exactly `rows` lines.
    const readyToClear = (rows: number): GameState => {
        const board = createBoard();
        for (let y = BOARD_HEIGHT - rows; y < BOARD_HEIGHT; y++) {
            board[y] = [...fullRow().slice(0, 9), 0];
        }
        const vertical = { type: 'I' as const, shape: [[0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0], [0, 0, 1, 0]], x: 7, y: 0 };
        return { ...startGame(['T', 'O']), board, piece: vertical };
    };

    it('starts at zero', () => {
        expect(startGame(['T'])).toMatchObject({ score: 0, lines: 0 });
    });
    it('gives nothing for gravity', () => {
        expect(fallTo(startGame(['T', 'O']), 10).score).toBe(0);
    });
    it('gives a point per row soft-dropped, and none for the step that locks', () => {
        const state = startGame(['T', 'O']);
        const once = softDrop(softDrop(state));
        expect(once.score).toBe(2);
        const resting = fallTo(state, BOARD_HEIGHT - 2);
        const locked = softDrop(resting);
        expect(locked.locks).toBe(1);
        expect(locked.score).toBe(0);
    });
    it('gives two points per row hard-dropped', () => {
        const state = startGame(['T', 'O']);
        const rows = hardDrop(state.board, state.piece!).y - state.piece!.y;
        expect(rows).toBeGreaterThan(0);
        expect(drop(state).score).toBe(rows * 2);
    });
    it('scores 100, 300, 500 and 800 for clearing 1 to 4 lines at once, and counts the lines', () => {
        [1, 2, 3, 4].forEach((rows, index) => {
            const state = readyToClear(rows);
            const dropPoints = (hardDrop(state.board, state.piece!).y - state.piece!.y) * 2;
            const after = drop(state);
            expect(after.cleared).toBe(rows);
            expect(after.lines).toBe(rows);
            expect(after.score - dropPoints).toBe([100, 300, 500, 800][index]);
        });
    });
    it('keeps adding up over the round, and does not change on red lines', () => {
        const once = drop(readyToClear(2));
        const twice = drop(once);
        expect(twice.score).toBeGreaterThan(once.score);
        expect(twice.lines).toBe(2);
        expect(receivePenalty(twice, 1, 'sara').score).toBe(twice.score);
    });
    it('does nothing for a soft drop when no game is running', () => {
        expect(softDrop(initialGame)).toBe(initialGame);
    });
});
