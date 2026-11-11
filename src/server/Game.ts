import { Piece } from './Piece';
import { Player } from './Player';

export type JoinError = 'nameTaken' | 'gameStarted';

export class Game {
    name: string;
    players: Player[];
    host: string | null;
    started: boolean;
    piece: Piece;

    constructor(name: string) {
        this.name = name;
        this.players = [];
        this.host = null;
        this.started = false;
        this.piece = new Piece();
    }

    addPlayer(name: string, id: string): JoinError | null {
        if (this.players.some((player) => player.name === name)) {
            return 'nameTaken';
        }
        if (this.started) {
            return 'gameStarted';
        }
        this.players.push(new Player(name, id));
        if (!this.host) {
            this.host = name;
        }
        return null;
    }

    removePlayer(id: string): void {
        const leaving = this.players.find((player) => player.id === id);
        if (!leaving) {
            return;
        }
        this.players = this.players.filter((player) => player.id !== id);
        if (!this.players.length) {
            this.host = null;
            return;
        }
        if (this.host === leaving.name) {
            this.host = this.players[0].name;
        }
    }

    isEmpty(): boolean {
        return (this.players.length === 0);
    }
}