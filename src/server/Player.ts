import type { PieceType} from '../shared/pieces';
import type { Piece } from './Piece';

export class Player {
    name: string;
    id: string;
    position: number;
    alive: boolean;

    constructor(name: string, id: string) {
        this.name = name;
        this.id = id;
        this.position = 0;
        this.alive = true;
    }

    nextPiece(piece: Piece): PieceType {
        const pieceType = piece.get(this.position);
        this.position++;
        return pieceType;
    }

    lose(): void {
        this.alive = false;
    }
    
    reset(): void {
        this.alive = true;
        this.position = 0;
    }
}
