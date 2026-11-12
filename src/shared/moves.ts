import { Piece, PieceType, SHAPES, rotate} from './pieces'
import { Board, isValid, BOARD_WIDTH } from './board'

export const move = (board: Board, piece: Piece, dx: number, dy: number): Piece => {
    const newPiece = {...piece, x: piece.x + dx, y: piece.y + dy};
    return isValid(board, newPiece) ? newPiece : piece;
}

export const rotatePiece = (board: Board, piece: Piece): Piece => {
    const newPiece = {...piece, shape: rotate(piece.shape)};
    return isValid(board, newPiece) ? newPiece : piece;
}

export const createPiece = (type: PieceType): Piece => {
    const size = SHAPES[type].length;
    return {type, shape: SHAPES[type].map((row) => [...row]), x: Math.floor((BOARD_WIDTH - size) / 2), y: 0};
};

export const canSpawn = (board: Board, piece: Piece): boolean => {
    return isValid(board, piece);
};

export const hardDrop = (board: Board, piece: Piece): Piece => {
    const next = move(board, piece, 0, 1);
    return next === piece ? piece : hardDrop(board, next);
};
