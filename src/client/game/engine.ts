import { createBoard, isValid, lockPiece, clearLines, addPenalty, type Board } from '../../shared/board';
import { move, rotatePiece, createPiece, canSpawn, hardDrop } from '../../shared/moves';
import type { Piece, PieceType } from '../../shared/pieces';

// The player's own game, as plain data. Every function here is pure: it takes a state
// and returns a new one, so the Redux slice is only a thin wrapper around them.

export type Status = 'idle' | 'playing' | 'lost';

export type GameState = {
    status: Status;
    board: Board;
    piece: Piece | null;
    // Piece types dealt by the server that have not been played yet.
    queue: PieceType[];
    // How many pieces have locked, so listeners can tell when the board settled.
    locks: number;
    // Lines cleared by the last lock.
    cleared: number;
    // Red lines received this round, and who sent the last ones.
    penalty: number;
    lastPenaltyFrom: string | null;
    // Points and lines cleared this round. The score is a bonus: the winner is still
    // the last player standing.
    score: number;
    lines: number;
};

export const initialGame: GameState = {
    status: 'idle',
    board: createBoard(),
    piece: null,
    queue: [],
    locks: 0,
    cleared: 0,
    penalty: 0,
    lastPenaltyFrom: null,
    score: 0,
    lines: 0,
};

// Points for clearing 1 to 4 lines with one piece, and for each row a piece is dropped.
export const LINE_POINTS = [0, 100, 300, 500, 800];
export const SOFT_DROP_POINTS = 1;
export const HARD_DROP_POINTS = 2;

const spawn = (state: GameState): GameState => {
    if (state.status !== 'playing' || state.piece || state.queue.length === 0) {
        return state;
    }
    const [type, ...queue] = state.queue;
    const piece = createPiece(type);
    if (!canSpawn(state.board, piece)) {
        return { ...state, queue, status: 'lost' };
    }
    return { ...state, queue, piece };
};

export const startGame = (queue: PieceType[]): GameState =>
    spawn({ ...initialGame, status: 'playing', board: createBoard(), queue });

export const receivePieces = (state: GameState, types: PieceType[]): GameState =>
    spawn({ ...state, queue: [...state.queue, ...types] });

const lock = (state: GameState, piece: Piece): GameState => {
    const { board, cleared } = clearLines(lockPiece(state.board, piece));
    return spawn({
        ...state, board, piece: null, locks: state.locks + 1, cleared,
        score: state.score + LINE_POINTS[cleared], lines: state.lines + cleared,
    });
};

const withPiece = (state: GameState, update: (board: Board, piece: Piece) => Piece): GameState => {
    if (state.status !== 'playing' || !state.piece) {
        return state;
    }
    return { ...state, piece: update(state.board, state.piece) };
};

export const shift = (state: GameState, dx: number): GameState =>
    withPiece(state, (board, piece) => move(board, piece, dx, 0));

export const rotate = (state: GameState): GameState => withPiece(state, rotatePiece);

// One step of gravity. A piece that cannot fall any further locks now: it touched the
// pile on the previous step, which gave the player that step to adjust it.
export const tick = (state: GameState): GameState => {
    if (state.status !== 'playing' || !state.piece) {
        return state;
    }
    const moved = move(state.board, state.piece, 0, 1);
    return moved === state.piece ? lock(state, state.piece) : { ...state, piece: moved };
};

// The player pressing down: one step of gravity, worth a point if the piece moved.
export const softDrop = (state: GameState): GameState => {
    const next = tick(state);
    const fell = next.locks === state.locks && next.piece !== state.piece;
    return fell ? { ...next, score: next.score + SOFT_DROP_POINTS } : next;
};

export const drop = (state: GameState): GameState => {
    if (state.status !== 'playing' || !state.piece) {
        return state;
    }
    const landed = hardDrop(state.board, state.piece);
    const rows = landed.y - state.piece.y;
    return lock({ ...state, score: state.score + rows * HARD_DROP_POINTS }, landed);
};

// Pushes the falling piece up until it fits again, by at most `rows` rows.
const liftPiece = (board: Board, piece: Piece, rows: number): Piece | null => {
    if (isValid(board, piece)) {
        return piece;
    }
    return rows === 0 ? null : liftPiece(board, { ...piece, y: piece.y - 1 }, rows - 1);
};

export const receivePenalty = (state: GameState, lines: number, from: string): GameState => {
    if (state.status !== 'playing' || lines <= 0) {
        return state;
    }
    const { board, lost } = addPenalty(state.board, lines);
    const piece = state.piece && liftPiece(board, state.piece, lines);
    const penalised = { ...state, board, penalty: state.penalty + lines, lastPenaltyFrom: from };
    if (lost || (state.piece && !piece)) {
        return { ...penalised, piece: null, status: 'lost' };
    }
    return { ...penalised, piece };
};
