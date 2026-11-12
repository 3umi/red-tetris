import { describe, it, expect } from 'vitest';
import { Game } from '../src/server/Game';

const gameWith = (names: string[]): Game => {
    const game = new Game('room1');
    names.forEach((name, index) => {
        game.addPlayer(name, `id${index + 1}`);
    });
    return game;
};

describe('Game', () => {
    it('starts empty, with no host and not started', () => {
        const game = new Game('room1');
        expect(game.host).toBe(null);
        expect(game.started).toBe(false);
        expect(game.players.length).toBe(0);
    });

    it('makes the first player the host', () => {
        const game = gameWith(['Alice']);
        expect(game.host).toBe('Alice');
        expect(game.players[0].name).toBe('Alice');
        expect(game.players[0].id).toBe('id1');
    });

    it('keeps the first host when others join', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        expect(game.host).toBe('Alice');
    });

    it('refuses a name already in the game', () => {
        const game = gameWith(['Alice']);
        const error = game.addPlayer('Alice', 'id2');
        expect(error).toBe('nameTaken');
        expect(game.players.length).toBe(1);
    });

    it('refuses to add players once started', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice')
        const error = game.addPlayer('Sara', 'id3');
        expect(error).toBe('gameStarted');
        expect(game.players.length).toBe(2);
    });

    it('has no host and is empty when the last player leaves', () => {
        const game = gameWith(['Alice']);
        game.removePlayer('id1');
        expect(game.host).toBe(null);
        expect(game.players.length).toBe(0);
        expect(game.isEmpty()).toBe(true);
    });

    it('gives the host role to the next player when the host leaves', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.removePlayer('id1');
        expect(game.host).toBe('Bob');
        expect(game.players.length).toBe(1);
    });

    it('keeps the host when another player leaves', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.removePlayer('id2');
        expect(game.host).toBe('Alice');
        expect(game.players.length).toBe(1);
    });

    it('removes a player by id', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.removePlayer('id2');
        expect(game.players.map((player) => player.name)).toEqual(['Alice', 'Sara']);
    });

    it('ignores an id that is not in the game', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.removePlayer('id9');
        expect(game.players.map((player) => player.name)).toEqual(['Alice', 'Bob']);
        expect(game.host).toBe('Alice');
    });

    it('starts the game when the host starts it', () => {
        const game = gameWith(['Alice', 'Bob']);
        const error = game.start('Alice');
        expect(game.started).toBe(true);
        expect(error).toBe(null);
    });

    it('refuses to start when the player is not the host', () => {
        const game = gameWith(['Alice', 'Bob']);
        const error = game.start('Bob');
        expect(game.started).toBe(false);
        expect(error).toBe('notHost');
    });

    it('refuses to start a game that already started', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        const error = game.start('Alice');
        expect(game.started).toBe(true);
        expect(error).toBe('alreadyStarted');
    });

    it('is not over while several players are alive', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('Alice');
        game.players[0].lose();
        expect(game.isOver()).toBe(false);
        expect(game.winner()).toBe(null);
    });

    it('is over when one player is left, and that player wins', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('Alice');
        game.players[0].lose();
        game.players[2].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe('Bob');
    });

    it('is over with no winner when the last players lose together', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        game.players[0].lose();
        game.players[1].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe(null);
    });

    it('is not over while a solo player is alive', () => {
        const game = gameWith(['Alice']);
        game.start('Alice');
        expect(game.isOver()).toBe(false);
        expect(game.winner()).toBe(null);
    });

    it('is over with no winner when a solo player loses', () => {
        const game = gameWith(['Alice']);
        game.start('Alice');
        game.players[0].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe(null);
    });

    it('ends the round and makes the last player win when the opponent leaves', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        game.removePlayer('id2');
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe('Alice');
    });

    it('refuses to restart when the player is not the host', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        game.players[1].lose();
        const error = game.restart('Bob');
        expect(error).toBe('notHost');
        expect(game.started).toBe(true);
    });

    it('refuses to restart while the round is still going', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        const error = game.restart('Alice');
        expect(error).toBe('notOver');
        expect(game.started).toBe(true);
    });

    it('resets players and the game when the host restarts', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('Alice');
        game.players[0].nextPiece(game.piece);
        game.players[1].lose();
        const oldPiece = game.piece;
        const error = game.restart('Alice');
        expect(error).toBe(null);
        expect(game.started).toBe(false);
        expect(game.players[0].position).toBe(0);
        expect(game.players[1].alive).toBe(true);
        expect(game.piece).not.toBe(oldPiece);
    });
});