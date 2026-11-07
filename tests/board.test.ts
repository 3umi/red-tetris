import { describe, it, expect } from 'vitest';
import { createBoard, isValid } from '../src/shared/board';
import { T } from '../src/shared/pieces'

describe('createBoard', () => {
    it('has 20 rows', () => {
        const board = createBoard();
        expect(board.length).toBe(20);
    });
    it('has 10 cells, all zeros', () => {
        const board = createBoard();
        for(let i = 0; i < 20; i++) {
            expect(board[i]).toEqual(Array(10).fill(0));
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
        expect(isValid(createBoard(), {shape: T, x: 0, y: 0})).toBe(true)
    });
    it('is invalid one column past the left wall', () => {
        expect(isValid(createBoard(), {shape: T, x: -1, y: 0})).toBe(false)
    });
    it('is valid touching the right wall', () => {
        expect(isValid(createBoard(), {shape: T, x: 7, y: 0})).toBe(true)
    });
    it('is invalid one column past the right wall', () => {
        expect(isValid(createBoard(), {shape: T, x: 8, y: 0})).toBe(false)
    });
    it('is invalid one row below the floor', () => {
        expect(isValid(createBoard(), {shape: T, x: 0, y: 19})).toBe(false)
    });
    it('is invalid when overlapping a locked block', () => {
        const board = createBoard();
        board[1][1] = 1;
        expect(isValid(board, {shape: T, x: 0, y: 0})).toBe(false)
    });
    it('is valid when only the empty row is below the floor', () => {
        expect(isValid(createBoard(), {shape: T, x: 0, y: 18})).toBe(true)
    });
})