const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game state
const rooms = {};
const playerColors = ['red', 'blue', 'green', 'yellow'];

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentRoom = null;

  socket.on('createRoom', () => {
    const roomId = generateRoomId();
    rooms[roomId] = {
      id: roomId,
      players: [],
      gameStarted: false,
      sequence: [],
      lastPlayerIndex: -1,
      timer: 120,
      timerInterval: null
    };
    
    currentRoom = roomId;
    joinRoom(socket, roomId);
    
    socket.emit('roomCreated', roomId);
    console.log(`Room created: ${roomId}`);
  });

  socket.on('joinRoom', (roomId) => {
    if (!rooms[roomId]) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    
    if (rooms[roomId].players.length >= 4) {
      socket.emit('error', 'Room is full');
      return;
    }
    
    if (rooms[roomId].gameStarted) {
      socket.emit('error', 'Game already started');
      return;
    }
    
    currentRoom = roomId;
    joinRoom(socket, roomId);
  });

  socket.on('startGame', () => {
    if (!currentRoom || !rooms[currentRoom]) return;
    
    const room = rooms[currentRoom];
    
    if (room.players.length < 2) {
      socket.emit('error', 'Need at least 2 players to start');
      return;
    }
    
    if (room.gameStarted) return;
    
    room.gameStarted = true;
    room.sequence = [];
    
    room.timerInterval = setInterval(() => {
      room.timer--;
      io.to(currentRoom).emit('updateTimer', room.timer);
      
      if (room.timer <= 0) {
        clearInterval(room.timerInterval);
        io.to(currentRoom).emit('gameLost', { reason: 'Time expired' });
        resetRoom(currentRoom);
      }
    }, 1000);
    
    io.to(currentRoom).emit('gameStarted');
    console.log(`Game started in room: ${currentRoom}`);
  });

  socket.on('selectNumber', (number) => {
    if (!currentRoom || !rooms[currentRoom]) return;
    
    const room = rooms[currentRoom];
    if (!room.gameStarted) return;
    
    const playerIndex = room.players.findIndex(p => p.id === socket.id);
    if (playerIndex === -1) return;
    
    if (room.lastPlayerIndex === playerIndex) {
      socket.emit('error', 'You cannot play consecutive turns');
      return;
    }
    
    const nextExpectedNumber = room.sequence.length + 1;
    
    if (parseInt(number) !== nextExpectedNumber) {
      clearInterval(room.timerInterval);
      io.to(currentRoom).emit('gameLost', { 
        reason: 'Wrong number selected', 
        expected: nextExpectedNumber, 
        selected: number 
      });
      resetRoom(currentRoom);
      return;
    }
    
    const delay = Math.floor(Math.random() * 15) + 1;
    
    socket.emit('numberProcessing', { number, delay });
    
    socket.to(currentRoom).emit('playerSelectingNumber', { number });
    
    setTimeout(() => {
      if (!rooms[currentRoom] || !rooms[currentRoom].gameStarted) return;
      
      room.sequence.push(number);
      room.lastPlayerIndex = playerIndex;
      
      io.to(currentRoom).emit('sequenceUpdated', {
        sequence: room.sequence,
        selectedBy: room.players[playerIndex].color
      });
      
      if (room.sequence.length === 10) {
        clearInterval(room.timerInterval);
        io.to(currentRoom).emit('gameWon');
        resetRoom(currentRoom);
      }
    }, delay * 1000);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    if (currentRoom && rooms[currentRoom]) {
      const playerIndex = rooms[currentRoom].players.findIndex(p => p.id === socket.id);
      
      if (playerIndex !== -1) {
        rooms[currentRoom].players.splice(playerIndex, 1);
        
        io.to(currentRoom).emit('playerLeft', {
          playerId: socket.id,
          players: rooms[currentRoom].players
        });
        
        if (rooms[currentRoom].gameStarted) {
          clearInterval(rooms[currentRoom].timerInterval);
          io.to(currentRoom).emit('gameLost', { reason: 'A player disconnected' });
          resetRoom(currentRoom);
        }
        
        if (rooms[currentRoom].players.length === 0) {
          delete rooms[currentRoom];
          console.log(`Room deleted: ${currentRoom}`);
        }
      }
    }
  });
});

function joinRoom(socket, roomId) {
  const room = rooms[roomId];
  const playerColor = playerColors[room.players.length];
  
  const player = {
    id: socket.id,
    color: playerColor
  };
  
  room.players.push(player);
  socket.join(roomId);
  
  socket.emit('joinedRoom', {
    roomId,
    playerId: socket.id,
    color: playerColor,
    players: room.players
  });
  
  socket.to(roomId).emit('playerJoined', {
    playerId: socket.id,
    color: playerColor,
    players: room.players
  });
}

function resetRoom(roomId) {
  if (!rooms[roomId]) return;
  
  const room = rooms[roomId];
  room.gameStarted = false;
  room.sequence = [];
  room.lastPlayerIndex = -1;
  room.timer = 120;
  
  if (room.timerInterval) {
    clearInterval(room.timerInterval);
    room.timerInterval = null;
  }
}

function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
