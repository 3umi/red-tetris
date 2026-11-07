import type { Piece } from './pieces';

export type Board = number[][];

export const createBoard = (): Board => {
    const board = [];
    for(let i = 0; i < 20; i++) {
        board.push(Array(10).fill(0));
    }
    return board;
};

export const isValid = (board: Board, piece: Piece): boolean => {
    const size = piece.shape.length
    for (let i = 0; i < size; i++) {
        for (let j =0; j < size; j++) {
            if (piece.shape[i][j] === 0) {
                continue;
            }
            const row = piece.y + i;
            const col = piece.x + j;
            if ((row < 0 || row >= board.length) || (col < 0 || col >= board[0].length)) {
                return false;
            }
            if (board[row][col] !== 0) {
                return false;
            }
        }
    }
    return true;
};