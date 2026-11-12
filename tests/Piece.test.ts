import { describe, it, expect } from 'vitest';
import { Piece } from '../src/server/Piece';

describe('Piece', () => {
    it('starts with an empty list', () => {
        const piece = new Piece();
        expect(piece.types.length).toBe(0);
    });
    it('fills one bag when the first piece is requested', () => {
        const piece = new Piece();
        piece.get(0);
        expect(piece.types.length).toBe(7);
    });
    it('returns the same type for the same index every time', () => {
        const piece = new Piece();
        const pieceType1 = piece.get(0);
        const pieceType2 = piece.get(0);
        expect(pieceType1).toBe(pieceType2);
    });
    it('adds enough bags to reach a far index', () => {
        const piece = new Piece();
        piece.get(15);
        expect(piece.types.length).toBe(21);
    });
    it('deals each bag as all seven types', () => {
        const piece = new Piece();
        piece.get(13);
        const bag1 = piece.types.slice(0, 7);
        const bag2 = piece.types.slice(7, 14);
        expect(bag1.sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
        expect(bag2.sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    });
});
