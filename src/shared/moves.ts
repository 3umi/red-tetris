import { Piece, rotate } from './pieces'
import { Board, isValid } from './board'

export const move = (board: Board, piece: Piece, dx: number, dy: number): Piece => {
    const newPiece = {...piece, x: piece.x + dx, y: piece.y + dy};
    return isValid(board, newPiece) ? newPiece : piece;
}

export const rotatePiece = (board: Board, piece: Piece): Piece => {
    const newPiece = {...piece, shape: rotate(piece.shape)};
    return isValid(board, newPiece) ? newPiece : piece;
}