import { createBag, type PieceType } from '../shared/pieces';

export class Piece {
    types: PieceType[];

    constructor() {
        this.types = [];
    }
    
    get(index: number): PieceType {
        while (this.types.length < index + 1) {
            this.types.push(...createBag(Math.random));
        }
        return this.types[index];
    }
}
