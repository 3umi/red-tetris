import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { Game } from './Game';
import type { PieceType } from '../shared/pieces';

const MAX_NAME_LENGTH = 32;

const isValidName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_NAME_LENGTH;

const toRoomUpdate = (game: Game) => ({
  host: game.players.find((player) => player.id === game.host)?.name,
  players: game.players.map((player) => player.name),
});

const piecesFrom = (game: Game, from: number): PieceType[] => {
  const pieces: PieceType[] = [];
  for (let i = from; i < from + 7; i++) {
    pieces.push(game.piece.get(i));
  }
  return pieces;
};

export const createApp = () => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  const rooms = new Map<string, Game>();

  app.get('/', (req, res) => {
    res.send('<h1> Red Tetris </h1>');
  });

  app.get('/:room/:player', (req, res) => res.send(`
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const [, room, player] = location.pathname.split('/').map(decodeURIComponent);
    const socket = io();
    socket.emit('joinRoom', { room: room, player: player });
    socket.on('roomUpdate', (data) => {
      console.log(data);
    });
    socket.on('joinError', (data) => {
      console.log(data);
    });
  </script>
`));

  io.on('connection', (socket) => {
    socket.on('disconnect', () => {
      const roomName: string | undefined = socket.data.room;
      const game = roomName === undefined ? undefined : rooms.get(roomName);
      if (!roomName || !game) {
        return;
      }
      game.removePlayer(socket.id);
      if (game.isEmpty()) {
        rooms.delete(roomName);
        return;
      }
      io.to(roomName).emit('roomUpdate', toRoomUpdate(game));
    });

    socket.on('joinRoom', (data: unknown) => {
      const { room: roomName, player } = (data ?? {}) as { room?: unknown; player?: unknown };
      if (!isValidName(roomName) || !isValidName(player)) {
        socket.emit('joinError', `Error: room and player must be 1 to ${MAX_NAME_LENGTH} characters`);
        return;
      }
      if (socket.data.room) {
        socket.emit('joinError', `Error: you are already in ${socket.data.room}`);
        return;
      }
      const game = rooms.get(roomName) ?? new Game(roomName);
      const error = game.addPlayer(player, socket.id);
      if (error) {
        const message = error === 'nameTaken'
            ? `Error: ${player} name already exists in ${roomName}`
            : `Error: ${roomName} has already started`;
        socket.emit('joinError', message);
        return;
      }
      rooms.set(roomName, game);
      socket.join(roomName);
      socket.data.room = roomName;
      io.to(roomName).emit('roomUpdate', toRoomUpdate(game));
    });

    socket.on('startGame', () => {
      const roomName: string | undefined = socket.data.room;
      const game = roomName === undefined ? undefined : rooms.get(roomName);
      if (!roomName || !game) {
        return;
      }
      const error = game.start(socket.id);
      if (error) {
        return;
      }
      io.to(roomName).emit('gameStarted', { pieces: piecesFrom(game, 0) });
    });
  });

  return { app, httpServer, io, rooms };
};
