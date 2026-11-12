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
        expect(game.host).toBe('id1');
        expect(game.players[0].name).toBe('Alice');
        expect(game.players[0].id).toBe('id1');
    });

    it('keeps the first host when others join', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        expect(game.host).toBe('id1');
    });

    it('refuses a name already in the game', () => {
        const game = gameWith(['Alice']);
        const error = game.addPlayer('Alice', 'id2');
        expect(error).toBe('nameTaken');
        expect(game.players.length).toBe(1);
    });

    it('refuses to add players once started', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
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
        expect(game.host).toBe('id2');
        expect(game.players.length).toBe(1);
    });

    it('keeps the host when another player leaves', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.removePlayer('id2');
        expect(game.host).toBe('id1');
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
        expect(game.host).toBe('id1');
    });

    it('starts the game when the host starts it', () => {
        const game = gameWith(['Alice', 'Bob']);
        const error = game.start('id1');
        expect(game.started).toBe(true);
        expect(error).toBe(null);
    });

    it('refuses to start when the player is not the host', () => {
        const game = gameWith(['Alice', 'Bob']);
        const error = game.start('id2');
        expect(game.started).toBe(false);
        expect(error).toBe('notHost');
    });

    it('refuses to start a game that already started', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        const error = game.start('id1');
        expect(game.started).toBe(true);
        expect(error).toBe('alreadyStarted');
    });

    it('is not over while several players are alive', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('id1');
        game.players[0].lose();
        expect(game.isOver()).toBe(false);
        expect(game.winner()).toBe(null);
    });

    it('is over when one player is left, and that player wins', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('id1');
        game.players[0].lose();
        game.players[2].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe('Bob');
    });

    it('is over with no winner when nobody is alive', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.players[0].lose();
        game.players[1].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe(null);
    });

    it('is not over while a solo player is alive', () => {
        const game = gameWith(['Alice']);
        game.start('id1');
        expect(game.isOver()).toBe(false);
        expect(game.winner()).toBe(null);
    });

    it('is over with no winner when a solo player loses', () => {
        const game = gameWith(['Alice']);
        game.start('id1');
        game.players[0].lose();
        expect(game.isOver()).toBe(true);
        expect(game.winner()).toBe(null);
    });

    it('ends the round and makes the last player win when the opponent leaves', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.removePlayer('id2');
        expect(game.started).toBe(false);
        expect(game.lastWinner).toBe('Alice');
    });

    it('marks the player as lost and keeps the round going', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('id1');
        game.playerLost('id2');
        expect(game.players[1].alive).toBe(false);
        expect(game.started).toBe(true);
        expect(game.lost).toEqual(['Bob']);
    });

    it('ends the round and saves the winner when one player is left', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.playerLost('id2');
        expect(game.started).toBe(false);
        expect(game.lastWinner).toBe('Alice');
    });

    it('records players in the order they lost', () => {
        const game = gameWith(['Alice', 'Bob', 'Sara']);
        game.start('id1');
        game.playerLost('id1');
        game.playerLost('id3');
        expect(game.lastWinner).toBe('Bob');
        expect(game.lost).toEqual(['Alice', 'Sara']);
    });

    it('ends a solo round with no winner', () => {
        const game = gameWith(['Alice']);
        game.start('id1');
        game.playerLost('id1');
        expect(game.started).toBe(false);
        expect(game.lastWinner).toBe(null);
    });

    it('lets a new player join after the round ends', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.playerLost('id2');
        const error = game.addPlayer('Sara', 'id3');
        expect(error).toBe(null);
        expect(game.players.length).toBe(3);
        expect(game.started).toBe(false);
    });

    it('ignores a loss outside a round', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.playerLost('id1');
        expect(game.players[0].alive).toBe(true);
        expect(game.lost).toEqual([]);
    });

    it('ignores a second loss from the same player', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.playerLost('id2');
        game.playerLost('id2');
        expect(game.lost).toEqual(['Bob']);
    });

    it('resets players and the round when the host starts again', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.players[0].nextPiece(game.piece);
        game.playerLost('id2');
        const oldPiece = game.piece;
        const error = game.start('id1');
        expect(error).toBe(null);
        expect(game.players[0].position).toBe(0);
        expect(game.players[1].alive).toBe(true);
        expect(game.piece).not.toBe(oldPiece);
        expect(game.lost).toEqual([]);
        expect(game.lastWinner).toBe(null);
    });

    it('is not over in the lobby after a round', () => {
        const game = gameWith(['Alice', 'Bob']);
        game.start('id1');
        game.playerLost('id2');
        game.removePlayer('id2');
        expect(game.isOver()).toBe(false);
        expect(game.winner()).toBe(null);
    });
});
