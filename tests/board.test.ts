import { describe, it, expect } from 'vitest';
import { createBoard } from '../src/shared/board';

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