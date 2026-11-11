import { describe, it, expect } from 'vitest';
import { Player } from '../src/server/Player';
import { Piece } from '../src/server/Piece';

describe('Player', () => {
    it('starts at position 0 and alive', () => {
        const player = new Player('alice', 'id1');
        expect(player.position).toBe(0);
        expect(player.alive).toBe(true);
    });
    it('moves forward one piece at a time', () => {
        const piece = new Piece();
        const player = new Player('alice', 'id1');
        player.nextPiece(piece);
        player.nextPiece(piece);
        expect(player.position).toBe(2);
    });
    it('gets the pieces in the shared order', () => {
        const piece = new Piece();
        const player = new Player('alice', 'id1');
        const piece1 = player.nextPiece(piece);
        const piece2 = player.nextPiece(piece);
        const piece3 = player.nextPiece(piece);
        expect(piece1).toBe(piece.get(0));
        expect(piece2).toBe(piece.get(1));
        expect(piece3).toBe(piece.get(2));
    });
    it('reads the same list as other players at its own pace', () => {
        const piece = new Piece();
        const playerBob = new Player('bob', 'id1');
        const playerAlice = new Player('alice', 'id2');
        const pieceBob = playerBob.nextPiece(piece);
        playerBob.nextPiece(piece);
        playerBob.nextPiece(piece);
        const pieceAlice = playerAlice.nextPiece(piece);
        expect(pieceAlice).toBe(pieceBob);
    });
    it('is not alive after losing', () => {
        const player = new Player('alice', 'id1');
        player.lose();
        expect(player.alive).toBe(false);
    });
    it('resets position and alive for a new round', () => {
        const piece = new Piece();
        const player = new Player('alice', 'id1');
        player.nextPiece(piece);
        player.nextPiece(piece);
        player.nextPiece(piece);
        player.lose();
        player.reset();
        expect(player.position).toBe(0);
        expect(player.alive).toBe(true);
    });
});