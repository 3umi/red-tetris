import type { PieceType } from '../../shared/pieces';

// Socket messages between the client and the server, as agreed on PR #7.
// When a round ends the server puts the room back in the lobby by itself; the host
// starts the next round with startGame, and gameStarted resets everything.

export type ClientToServer = {
    joinRoom: (data: { room: string; player: string }) => void;
    // Host only: starts a round, or the next one after a round is over.
    startGame: () => void;
    // The player's board settled: send the new spectrum to the opponents.
    boardChanged: (data: { spectrum: number[] }) => void;
    // Clearing n lines sends n - 1 red lines to every opponent.
    linesCleared: (data: { count: number }) => void;
    // Ask for the next pieces of the shared sequence, starting at `from`.
    requestPieces: (data: { from: number }) => void;
    lost: () => void;
};

export type ServerToClient = {
    roomUpdate: (data: { host: string; players: string[] }) => void;
    joinError: (message: string) => void;
    // A new round: forget the last one, from the lobby or the game-over screen.
    gameStarted: (data: { pieces: PieceType[] }) => void;
    pieces: (data: { pieces: PieceType[] }) => void;
    spectrum: (data: { name: string; spectrum: number[] }) => void;
    penalty: (data: { lines: number; from: string }) => void;
    playerOut: (data: { name: string }) => void;
    // `lost` is everyone who lost this round, first out first.
    gameOver: (data: { winner: string | null; lost: string[] }) => void;
};
