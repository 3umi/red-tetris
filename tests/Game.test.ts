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
        game.started = true;
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
});