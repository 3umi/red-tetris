import { Piece } from './Piece';
import { Player } from './Player';

export type JoinError = 'nameTaken' | 'gameStarted';
export type StartError = 'notHost' | 'alreadyStarted';
export type RestartError = 'notHost' | 'notOver';

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

    start(name: string): StartError | null {
        if (this.host !== name) {
            return 'notHost';
        }
        if (this.started) {
            return 'alreadyStarted';
        }
        this.started = true;
        return null;
    }

    isOver(): boolean {
        const alive = this.players.filter((player) => player.alive).length;
        if (this.players.length > 1 && alive === 1) {
            return true;
        }
        return alive === 0;
    }

    winner(): string | null {
        const alive = this.players.filter((player) => player.alive);
        if (this.players.length > 1 && alive.length === 1) {
            return alive[0].name;
        }
        return null;
    }

    restart(name: string): RestartError | null {
        if (this.host !== name) {
            return 'notHost';
        }
        if (!this.isOver()) {
            return 'notOver';
        }
        this.started = false;
        this.players.forEach((player) => player.reset());
        this.piece = new Piece();
        return null;
    }

    isEmpty(): boolean {
        return (this.players.length === 0);
    }
}