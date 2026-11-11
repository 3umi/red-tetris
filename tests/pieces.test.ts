import { describe, it, expect } from 'vitest';
import { rotate, T, O, createBag, SHAPES, CELL } from '../src/shared/pieces';

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

describe('piece types', () => {
    it('has the seven shapes', () => {
        expect(Object.keys(SHAPES).sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    });
    it('gives each type its own non-empty, non-penalty cell value', () => {
        const values = Object.values(CELL);
        expect(new Set(values).size).toBe(7);
        values.forEach((value) => {
            expect(value).toBeGreaterThan(0);
            expect(value).not.toBe(8);
        });
    });
});

describe('createBag', () => {
    it('has 7 pieces', () => {
        const bag = createBag();
        expect(bag.length).toBe(7);
    });
    it('contains each type exactly once', () => {
        const bag = createBag();
        expect([...bag].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
    });
    it('returns a new array each time', () => {
        const bag1 = createBag();
        const bag2 = createBag();
        expect(bag2).not.toBe(bag1);
    });
});