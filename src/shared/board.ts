import { CELL, type Piece } from './pieces';

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const EMPTY = 0;
export const PENALTY = 8;

export const emptyRow = (): number[] => Array(BOARD_WIDTH).fill(EMPTY);
export const fullRow = (): number[] => Array(BOARD_WIDTH).fill(CELL.I);
export const penaltyRow = (): number[] => Array(BOARD_WIDTH).fill(PENALTY);

export type Board = number[][];

export const createBoard = (): Board => {
    const board: Board = [];
    for (let i = 0; i < BOARD_HEIGHT; i++) {
        board.push(emptyRow());
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
            if (board[row][col] !== EMPTY) {
                return false;
            }
        }
    }
    return true;
};

// The piece must already be valid on the board (see isValid).
export const lockPiece = (board: Board, piece: Piece): Board => {
    const newBoard = board.map((row) => [...row]);
    const size = piece.shape.length;
    for (let i = 0; i < size; i++) {
        for (let j = 0; j < size; j++) {
            if (piece.shape[i][j] === 0) {
                continue;
            }
            newBoard[piece.y + i][piece.x + j] = CELL[piece.type];
        }
    }
    return newBoard;
};

export const clearLines = (board: Board): { board: Board; cleared: number } => {
    const isFull = (row: number[]) => row.every((cell) => cell !== EMPTY && cell !== PENALTY);
    const newBoard = board.filter((row) => !isFull(row));
    const cleared = board.length - newBoard.length;
    for (let i = 0; i < cleared; i++) {
        newBoard.unshift(Array(board[0].length).fill(EMPTY));
    }
    return { board: newBoard, cleared };
};

export const addPenalty = (board: Board, n: number): { board: Board; lost: boolean } => {
    const lostRows = board.slice(0, n);
    const lost = lostRows.some((row) => row.some((cell) => cell !== EMPTY));
    const kept = board.slice(n);
    for(let i = 0; i < n; i++) {
        kept.push(penaltyRow());
    }
    return { board: kept, lost };
};

export const getSpectrum = (board: Board): number[] => {
    const heights: number[] = [];
    for (let col = 0; col < board[0].length; col++) {
        let height = 0;
        for (let row = 0; row < board.length; row++) {
            if (board[row][col] !== EMPTY) {
                height = board.length - row;
                break;
            }
        }
        heights.push(height);
    }
    return heights;
};
