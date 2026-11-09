import { describe, it, expect } from 'vitest';
import { rotate, T, O } from '../src/shared/pieces';

describe('rotate', () => {
    it('rotate give the turn 1 grid', () => {
        const shape = rotate(T);
        expect(shape).toEqual([[0,1,0], [0,1,1], [0,1,0]])
    });
    it('rotate back to original', () => {
        let shape = T;
        for(let i = 0; i < 4; i++) {
            shape = rotate(shape);
        }
        expect(shape).toEqual(T);
    });
    it('rotate O gives O', () => {
        const shape = rotate(O);
        expect(shape).toEqual(O);
    });
    it('rotate does not change shape', () => {
        rotate(T);
        expect(T).toEqual([[0,1,0],[1,1,1],[0,0,0]]);
    })
})