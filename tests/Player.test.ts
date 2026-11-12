import { describe, it, expect } from 'vitest';
import { Player } from '../src/server/Player';

describe('Player', () => {
    it('starts alive', () => {
        const player = new Player('alice', 'id1');
        expect(player.alive).toBe(true);
    });
    it('is not alive after losing', () => {
        const player = new Player('alice', 'id1');
        player.lose();
        expect(player.alive).toBe(false);
    });
    it('is alive again after a reset', () => {
        const player = new Player('alice', 'id1');
        player.lose();
        player.reset();
        expect(player.alive).toBe(true);
    });
});
