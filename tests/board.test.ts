import { describe, it, expect } from 'vitest';
import { createBoard, isValid, lockPiece, clearLines, BOARD_WIDTH, BOARD_HEIGHT } from '../src/shared/board';
import { T } from '../src/shared/pieces';

const emptyRow = () => Array(BOARD_WIDTH).fill(0);
const fullRow = () => Array(BOARD_WIDTH).fill(1);
const penaltyRow = () => Array(BOARD_WIDTH).fill(2);

describe('createBoard', () => {
    it('has 20 rows', () => {
        const board = createBoard();
        expect(board.length).toBe(BOARD_HEIGHT);
    });
    it('has 10 cells, all zeros', () => {
        const board = createBoard();
        for (let i = 0; i < BOARD_HEIGHT; i++) {
            expect(board[i]).toEqual(emptyRow());
        }
    });
    it('rows are separate', () => {
        const board = createBoard();
        board[0][3] = 1;
        expect(board[5][3]).toBe(0);
    });
});

describe('isValid', () => {
    it('is valid at the top of an empty board', () => {
        expect(isValid(createBoard(), { shape: T, x: 0, y: 0 })).toBe(true);
    });
    it('is invalid one column past the left wall', () => {
        expect(isValid(createBoard(), { shape: T, x: -1, y: 0 })).toBe(false);
    });
    it('is valid touching the right wall', () => {
        expect(isValid(createBoard(), { shape: T, x: 7, y: 0 })).toBe(true);
    });
    it('is invalid one column past the right wall', () => {
        expect(isValid(createBoard(), { shape: T, x: 8, y: 0 })).toBe(false);
    });
    it('is invalid one row below the floor', () => {
        expect(isValid(createBoard(), { shape: T, x: 0, y: 19 })).toBe(false);
    });
    it('is invalid when overlapping a locked block', () => {
        const board = createBoard();
        board[1][1] = 1;
        expect(isValid(board, { shape: T, x: 0, y: 0 })).toBe(false);
    });
    it('is valid when only the empty row is below the floor', () => {
        expect(isValid(createBoard(), { shape: T, x: 0, y: 18 })).toBe(true);
    });
});

describe('lockPiece', () => {
    it('writes the piece cells into the board', () => {
        const board = lockPiece(createBoard(), { shape: T, x: 3, y: 18 });
        expect(board[18][4]).toBe(1);
        expect(board[19][3]).toBe(1);
        expect(board[19][4]).toBe(1);
        expect(board[19][5]).toBe(1);
    });
    it('does not change the original board', () => {
        const board = createBoard();
        lockPiece(board, { shape: T, x: 3, y: 18 });
        expect(board).toEqual(createBoard());
    });
});

describe('clearLines', () => {
    it('clears nothing when no row is full', () => {
        const { board, cleared } = clearLines(createBoard());
        expect(board).toEqual(createBoard());
        expect(cleared).toBe(0);
    });
    it('clears a full row and moves the rows above down', () => {
        const board = createBoard();
        board[19] = fullRow();
        board[18][0] = 1;
        const { board: newBoard, cleared } = clearLines(board);
        expect(cleared).toBe(1);
        expect(newBoard[19][0]).toBe(1);
        expect(newBoard[19][1]).toBe(0);
        expect(newBoard[0]).toEqual(emptyRow());
    });
    it('clears full rows that are not next to each other', () => {
        const board = createBoard();
        board[17] = fullRow();
        board[18][0] = 1;
        board[19] = fullRow();
        const { board: newBoard, cleared } = clearLines(board);
        expect(cleared).toBe(2);
        expect(newBoard[19][0]).toBe(1);
        expect(newBoard[19][1]).toBe(0);
        expect(newBoard[0]).toEqual(emptyRow());
        expect(newBoard[1]).toEqual(emptyRow());
    });
    it('keeps the board at 20 rows', () => {
        const board = createBoard();
        board[17] = fullRow();
        board[18][0] = 1;
        board[19] = fullRow();
        const { board: newBoard} = clearLines(board);
        expect(newBoard.length).toBe(BOARD_HEIGHT);
    });
    it('does not change the original board', () => {
        const board = createBoard();
        board[17] = fullRow();
        board[18][0] = 1;
        board[19] = fullRow();
        const { board: newBoard} = clearLines(board);
        expect(board[19]).toEqual(fullRow());
    });
    it('never clears a penalty row', () => {
        const board = createBoard();
        board[19] = penaltyRow();
        board[18] = fullRow();
        const { board: newBoard, cleared} = clearLines(board);
        expect(cleared).toBe(1);
        expect(newBoard[19]).toEqual(penaltyRow());
    });
});