import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.get('/', (req, res) => {
   res.send('<h1> Red Tetris </h1>') 
});

app.get('/:room/:player', (req, res) => res.send(`<script src="/socket.io/socket.io.js"> </script>
                                                  <script>
                                                    const socket = io();
                                                    socket.emit('joinRoom', {room: '${req.params.room}', player: '${req.params.player}'});
                                                    socket.on('roomUpdate', (data) => {
                                                        console.log(data);
                                                    });
                                                    socket.on('joinError', (data) => {
                                                        console.log(data);
                                                    });
                                                  </script>`));

const rooms = {};

io.on('connection', (socket) => {
  console.log('connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log(`user with: ${socket.id} disconnected because of ${reason}`);
    if (!socket.data.room) {
        return;
    }
    rooms[socket.data.room].players = rooms[socket.data.room].players.filter((name) => name !== socket.data.player);
    if (rooms[socket.data.room].host === socket.data.player) {
        if (rooms[socket.data.room].players.length) {
            rooms[socket.data.room].host = rooms[socket.data.room].players[0];
        } else {
            delete rooms[socket.data.room];
            return;
        }
    }
    io.to(socket.data.room).emit('roomUpdate', rooms[socket.data.room]);
  })
  socket.on('joinRoom', (data) => {
    if (rooms[data.room] && rooms[data.room].players.includes(data.player)) {
        socket.emit('joinError', `Error: ${data.player} name already exists in ${data.room}`);
        return;
    }
    console.log(`player: ${data.player} wants to join: ${data.room}`);
    socket.join(data.room);
    socket.data.player = data.player;
    socket.data.room = data.room;
    if (!rooms[data.room]) {
        rooms[data.room] = { host: data.player, players: [data.player] };
    } else {
        rooms[data.room].players.push(data.player);
    }
    console.log(rooms);
    io.to(data.room).emit('roomUpdate', rooms[data.room]);
  })
});

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});