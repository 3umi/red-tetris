import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

type Room = {
  host: string;
  players: string[];
};

const MAX_NAME_LENGTH = 32;

const isValidName = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= MAX_NAME_LENGTH;

export const createApp = () => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  // A Map, not a plain object, so room names like "toString" or "__proto__" are just names.
  const rooms = new Map<string, Room>();

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
      const room = roomName === undefined ? undefined : rooms.get(roomName);
      if (!roomName || !room) {
        return;
      }
      room.players = room.players.filter((name) => name !== socket.data.player);
      if (room.players.length === 0) {
        rooms.delete(roomName);
        return;
      }
      if (room.host === socket.data.player) {
        room.host = room.players[0];
      }
      io.to(roomName).emit('roomUpdate', room);
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
      const room = rooms.get(roomName);
      if (room && room.players.includes(player)) {
        socket.emit('joinError', `Error: ${player} name already exists in ${roomName}`);
        return;
      }
      socket.join(roomName);
      socket.data.player = player;
      socket.data.room = roomName;
      if (room) {
        room.players.push(player);
      } else {
        rooms.set(roomName, { host: player, players: [player] });
      }
      io.to(roomName).emit('roomUpdate', rooms.get(roomName));
    });
  });

  return { app, httpServer, io, rooms };
};
