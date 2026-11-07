import { describe, it, expect } from 'vitest';
import { move, rotatePiece } from '../src/shared/moves';
import { createBoard } from '../src/shared/board';
import { T, I, rotate } from '../src/shared/pieces';

describe('move', () => {
    it('moves right in open space', () => {
        const newPiece = move(createBoard(), {shape: T, x: 3, y: 5}, 1, 0);
        expect(newPiece.x).toBe(4);
    });
    it('stays in place when moving left into the wall', () => {
        const piece = {shape: T, x: 0, y: 0};
        const newPiece = move(createBoard(), piece, -1, 0);
        expect(newPiece).toEqual(piece);
    });
    it('stays in place when moving down into the floor', () => {
        const piece = {shape: T, x: 0, y: 18};
        const newPiece = move(createBoard(), piece, 0, 1);
        expect(newPiece).toEqual(piece);
    });
    it('does not change the original piece', () => {
        const piece = {shape: T, x: 0, y: 0};
        const newPiece = move(createBoard(), piece, 1, 0);
        expect(piece.x).toBe(0);
    });
})

describe('rotatePiece', () => {
    it('rotates in open space', () => {
        const piece = {shape: T, x: 3, y: 5};
        const newPiece = rotatePiece(createBoard(), piece);
        expect(newPiece.shape).toEqual([[0,1,0], [0,1,1], [0,1,0]]);
    });
    it('stays in place when the wall blocks rotation', () => {
        const piece = {shape: rotate(I), x: 7, y: 0};
        const newPiece = rotatePiece(createBoard(), piece);
        expect(newPiece).toEqual(piece);
    });
});