export type Shape = number[][];
export type Piece = {
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

export const rotate = (shape : Shape): Shape => {
    let rotatedShape: Shape = [];
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
