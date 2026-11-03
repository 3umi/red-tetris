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
                                                  </script>`));

io.on('connection', (socket) => {
  console.log('connected:', socket.id);
  socket.on('disconnect', (reason) => {
    console.log(`user with: ${socket.id} disconnected because of ${reason}`);
  })
  socket.on('joinRoom', (data) => {
    console.log(`player: ${data.player} wants to join: ${data.room}`)
  })
});

httpServer.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});