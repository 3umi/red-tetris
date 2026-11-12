import type { ReactNode } from 'react';
import type { Board as BoardData } from '../../shared/board';
import { CELL, type Piece } from '../../shared/pieces';

type Props = {
    board: BoardData;
    piece?: Piece | null;
    children?: ReactNode;
};

// Draws the falling piece on top of the locked cells.
const withPiece = (board: BoardData, piece: Piece | null | undefined): BoardData =>
    piece
        ? board.map((row, y) => row.map((cell, x) => {
            const shapeRow = piece.shape[y - piece.y];
            return shapeRow && shapeRow[x - piece.x] ? CELL[piece.type] : cell;
        }))
        : board;

export const Board = ({ board, piece, children }: Props) => (
    <div className="board" role="grid" aria-label="Your board">
        {withPiece(board, piece).flatMap((row, y) => row.map((cell, x) => (
            <div key={`${x}-${y}`} className={`cell cell-${cell}`} data-cell={cell} />
        )))}
        {children}
    </div>
);
