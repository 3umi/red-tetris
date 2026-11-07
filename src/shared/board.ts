import type { Piece } from './pieces';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type Board = number[][];

export const createBoard = (): Board => {
    const board: Board = [];
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        board.push(Array(BOARD_WIDTH).fill(0));
    }
    return board;
};

export const isValid = (board: Board, piece: Piece): boolean => {
    const size = piece.shape.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (piece.shape[i][j] === 0) {
                continue;
            }
            const row = piece.y + i;
            const col = piece.x + j;
            if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
                return false;
            }
            if (board[row][col] !== 0) {
                return false;
            }
        }
    }
    return true;
};

export const lockPiece = (board: Board, piece: Piece): Board => {
    const newBoard = board.map((row) => [...row]);
    const size = piece.shape.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (piece.shape[i][j] === 0) {
                continue;
            }
            newBoard[piece.y + i][piece.x + j] = 1;
        }
    }
    return newBoard;
};

export const clearLines = (board: Board): { board: Board; cleared: number } => {
    const newBoard = board.filter((row) => !row.every((cell) => cell !== 0));
    const cleared = board.length - newBoard.length;
    for (let i = 0; i < cleared; i++) {
        newBoard.unshift(Array(board[0].length).fill(0));
    }
    return { board: newBoard, cleared };
};