import type { PieceType } from '../../shared/pieces';

// Socket messages between the client and the server. Only joinRoom, roomUpdate and
// joinError exist on the server today; the rest are the client's side of the protocol
// proposed for the socket wiring.

export type ClientToServer = {
    joinRoom: (data: { room: string; player: string }) => void;
    startGame: () => void;
    restartGame: () => void;
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
    gameStarted: (data: { pieces: PieceType[] }) => void;
    pieces: (data: { pieces: PieceType[] }) => void;
    spectrum: (data: { name: string; spectrum: number[] }) => void;
    penalty: (data: { lines: number; from: string }) => void;
    playerOut: (data: { name: string }) => void;
    gameOver: (data: { winner: string | null }) => void;
    // The host restarted: everyone is back in the lobby.
    roundReset: () => void;
};
