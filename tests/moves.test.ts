import { describe, it, expect } from 'vitest';
import { move, rotatePiece, createPiece, canSpawn } from '../src/shared/moves';
import { createBoard } from '../src/shared/board';
import { T, I, rotate, Piece, PieceType, SHAPES } from '../src/shared/pieces';

describe('move', () => {
    it('moves right in open space', () => {
        const newPiece = move(createBoard(), {type: 'T', shape: T, x: 3, y: 5}, 1, 0);
        expect(newPiece.x).toBe(4);
    });
    it('stays in place when moving left into the wall', () => {
        const piece: Piece = {type: 'T', shape: T, x: 0, y: 0};
        const newPiece = move(createBoard(), piece, -1, 0);
        expect(newPiece).toEqual(piece);
    });
    it('stays in place when moving down into the floor', () => {
        const piece: Piece = {type: 'T', shape: T, x: 0, y: 18};
        const newPiece = move(createBoard(), piece, 0, 1);
        expect(newPiece).toEqual(piece);
    });
    it('does not change the original piece', () => {
        const piece: Piece = {type: 'T', shape: T, x: 0, y: 0};
        const newPiece = move(createBoard(), piece, 1, 0);
        expect(piece.x).toBe(0);
    });
})

describe('rotatePiece', () => {
    it('rotates in open space', () => {
        const piece: Piece = {type: 'T', shape: T, x: 3, y: 5};
        const newPiece = rotatePiece(createBoard(), piece);
        expect(newPiece.shape).toEqual([[0,1,0], [0,1,1], [0,1,0]]);
    });
    it('stays in place when the wall blocks rotation', () => {
        const piece: Piece = {type: 'I', shape: rotate(I), x: 7, y: 0};
        const newPiece = rotatePiece(createBoard(), piece);
        expect(newPiece).toEqual(piece);
    });
});

describe('createPiece', () => {
    it('builds the shape from the type', () => {
        const piece = createPiece('T');
        expect(piece.shape).toEqual([[0,1,0], [1,1,1], [0,0,0]]);
    });
    it('centres a 3-wide piece at x 3', () => {
        const piece = createPiece('T');
        expect(piece.x).toBe(3);
        expect(piece.y).toBe(0);
    });
    it('centres the I piece at x 3', () => {
        const piece = createPiece('I');
        expect(piece.x).toBe(3);
        expect(piece.y).toBe(0);
    });
    it('centres the O piece at x 4', () => {
        const piece = createPiece('O');
        expect(piece.x).toBe(4);
        expect(piece.y).toBe(0);
    });
});
  
describe('canSpawn', () => {
    it('is true on an empty board', () => {
        const board = createBoard();
        expect(canSpawn(board, createPiece('T'))).toBe(true);
    });
    it('is false when a block sits where the piece appears', () => {
        const board = createBoard();
        board[0][4] = 1;
        expect(canSpawn(board, createPiece('T'))).toBe(false);
    });
    it('is true when blocks are only outside the spawn area', () => {
        const board = createBoard();
        board[0][3] = 1;
        expect(canSpawn(board, createPiece('T'))).toBe(true);
    });
});