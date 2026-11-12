import express from 'express';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { Server } from 'socket.io';

type Room = {
  host: string;
  players: string[];
};

const MAX_NAME_LENGTH = 32;

const isValidName = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= MAX_NAME_LENGTH;

const DEFAULT_CLIENT_DIR = join(import.meta.dirname, '../../dist');

export const createApp = ({ clientDir = DEFAULT_CLIENT_DIR }: { clientDir?: string } = {}) => {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer);
  // A Map, not a plain object, so room names like "toString" or "__proto__" are just names.
  const rooms = new Map<string, Room>();

  // The built client (see vite.config.ts): index.html, bundle.js and assets.
  app.use(express.static(clientDir, { index: 'index.html' }));
  // Room URLs are routes of the single-page app, so they all get index.html.
  app.get('/:room/:player', (req, res) => {
    res.sendFile(join(clientDir, 'index.html'));
  });

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
