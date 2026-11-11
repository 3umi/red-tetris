export type Shape = number[][];
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Piece = {
    type: PieceType,
    shape: Shape,
    x: number,
    y: number
};

export const I: Shape = [[0,0,0,0], [1,1,1,1], [0,0,0,0], [0,0,0,0]];
export const O: Shape = [[1, 1], [1, 1]];
export const T: Shape = [[0,1,0], [1,1,1], [0,0,0]];
export const S: Shape = [[0,1,1], [1,1,0], [0,0,0]];
export const Z: Shape = [[1,1,0], [0,1,1], [0,0,0]];
export const J: Shape = [[1,0,0], [1,1,1], [0,0,0]];
export const L: Shape = [[0,0,1], [1,1,1], [0,0,0]];

export const SHAPES: Record<PieceType, Shape> = { I, O, T, S, Z, J, L };

// The value a locked block of each type leaves on the board. 0 is empty, 8 is a penalty block.
export const CELL: Record<PieceType, number> = { I: 1, O: 2, T: 3, S: 4, Z: 5, J: 6, L: 7 };

export const rotate = (shape : Shape): Shape => {
    const rotatedShape: Shape = [];
    const size = shape.length
    for (let i = 0; i < size; i++) {
        const row: number[] = [];
        for (let j = 0; j < size; j++) {
            row.push(shape[size - 1 - j][i])
        }
        rotatedShape.push(row);
    }
    return rotatedShape;
}

export const createBag = (random: () => number): PieceType[] => {
    const pieces: PieceType[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
    for (let i = pieces.length - 1; i > 0; i--) {
        const rand = Math.floor(random() * (i + 1));
        [pieces[i], pieces[rand]] = [pieces[rand], pieces[i]];
    }
    return pieces;
};
