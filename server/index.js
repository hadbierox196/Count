// server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { createGame, joinGame, startGame, processNumberSelection } = require('./game');

// Create Express app
const app = express();
const server = http.createServer(app);

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Socket.IO
const io = new Server(server);

// Game rooms storage
const gameRooms = {};

// Available player colors
const PLAYER_COLORS = ['red', 'blue', 'green', 'yellow'];

// Socket.IO connection
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  // Create a new game room
  socket.on('createGame', () => {
    const roomId = generateRoomId();
    gameRooms[roomId] = createGame();
    
    socket.join(roomId);
    socket.emit('gameCreated', { roomId });
    
    // Assign player color
    const playerColor = PLAYER_COLORS[0];
    gameRooms[roomId].players[socket.id] = {
      id: socket.id,
      color: playerColor,
      canSelectConsecutive: false,
      lastSelected: null
    };
    
    socket.emit('playerAssigned', { color: playerColor });
    io.to(roomId).emit('updateLobby', { players: getPlayersInRoom(roomId) });
    
    socket.roomId = roomId;
    console.log(`Game created: ${roomId}`);
  });
  
  // Join an existing game room
  socket.on('joinGame', (data) => {
    const { roomId } = data;
    
    if (!gameRooms[roomId]) {
      socket.emit('error', { message: 'Game room not found' });
      return;
    }
    
    if (Object.keys(gameRooms[roomId].players).length >= 4) {
      socket.emit('error', { message: 'Game room is full' });
      return;
    }
    
    socket.join(roomId);
    
    // Assign player color
    const takenColors = Object.values(gameRooms[roomId].players).map(p => p.color);
    const availableColors = PLAYER_COLORS.filter(color => !takenColors.includes(color));
    const playerColor = availableColors[0];
    
    gameRooms[roomId].players[socket.id] = {
      id: socket.id,
      color: playerColor,
      canSelectConsecutive: false,
      lastSelected: null
    };
    
    socket.emit('playerAssigned', { color: playerColor });
    io.to(roomId).emit('updateLobby', { players: getPlayersInRoom(roomId) });
    
    socket.roomId = roomId;
    console.log(`Player joined: ${roomId}`);
  });
  
  // Start the game
  socket.on('startGame', () => {
    const roomId = socket.roomId;
    
    if (!roomId || !gameRooms[roomId]) {
      socket.emit('error', { message: 'Game room not found' });
      return;
    }
    
    const playerCount = Object.keys(gameRooms[roomId].players).length;
    if (playerCount < 2) {
      socket.emit('error', { message: 'Need at least 2 players to start' });
      return;
    }
    
    startGame(gameRooms[roomId]);
    io.to(roomId).emit('gameStarted', { 
      sequence: gameRooms[roomId].sequence,
      timeLeft: gameRooms[roomId].timeLeft
    });
    
    // Start the game timer
    gameRooms[roomId].timer = setInterval(() => {
      gameRooms[roomId].timeLeft -= 1;
      
      io.to(roomId).emit('updateTimer', { timeLeft: gameRooms[roomId].timeLeft });
      
      if (gameRooms[roomId].timeLeft <= 0) {
        clearInterval(gameRooms[roomId].timer);
        io.to(roomId).emit('gameLost', { reason: 'Time expired' });
      }
    }, 1000);
  });
  
  // Player selects a number
  socket.on('selectNumber', (data) => {
    const { number } = data;
    const roomId = socket.roomId;
    
    if (!roomId || !gameRooms[roomId] || !gameRooms[roomId].active) {
      socket.emit('error', { message: 'Game not active' });
      return;
    }
    
    const playerData = gameRooms[roomId].players[socket.id];
    const gameState = gameRooms[roomId];
    
    // Check if the player can select consecutive numbers
    if (playerData.lastSelected !== null && 
        number === playerData.lastSelected + 1) {
      socket.emit('error', { message: 'You cannot select consecutive numbers' });
      return;
    }
    
    // Check if number is already in sequence
    if (gameState.sequence.includes(number)) {
      socket.emit('error', { message: 'Number already selected' });
      return;
    }
    
    // Check if this is the next correct number in sequence
    const expectedNumber = gameState.sequence.length + 1;
    if (number !== expectedNumber) {
      clearInterval(gameState.timer);
      io.to(roomId).emit('gameLost', { 
        reason: `Wrong sequence: expected ${expectedNumber}, got ${number}` 
      });
      return;
    }
    
    // Generate random delay between 1-15 seconds
    const delay = Math.floor(Math.random() * 15) + 1;
    socket.emit('processingSelection', { number, delay });
    
    // Process the selection after delay
    setTimeout(() => {
      processNumberSelection(gameState, socket.id, number);
      
      // Update player's last selected number
      playerData.lastSelected = number;
      
      // Broadcast the updated sequence to all players
      io.to(roomId).emit('updateSequence', { 
        sequence: gameState.sequence,
        selectedBy: socket.id,
        playerColor: playerData.color
      });
      
      // Check if game is complete
      if (gameState.sequence.length === 10) {
        clearInterval(gameState.timer);
        io.to(roomId).emit('gameWon');
      }
    }, delay * 1000);
  });
  
  // Player disconnects
  socket.on('disconnect', () => {
    const roomId = socket.roomId;
    
    if (roomId && gameRooms[roomId]) {
      // Remove player from the room
      if (gameRooms[roomId].players[socket.id]) {
        delete gameRooms[roomId].players[socket.id];
      }
      
      // If room is empty, delete it
      if (Object.keys(gameRooms[roomId].players).length === 0) {
        if (gameRooms[roomId].timer) {
          clearInterval(gameRooms[roomId].timer);
        }
        delete gameRooms[roomId];
        console.log(`Room deleted: ${roomId}`);
      } else {
        // Update lobby for remaining players
        io.to(roomId).emit('updateLobby', { players: getPlayersInRoom(roomId) });
        
        // If game is active and not enough players, end the game
        if (gameRooms[roomId].active && Object.keys(gameRooms[roomId].players).length < 2) {
          if (gameRooms[roomId].timer) {
            clearInterval(gameRooms[roomId].timer);
          }
          io.to(roomId).emit('gameLost', { reason: 'Not enough players' });
          gameRooms[roomId].active = false;
        }
      }
    }
    
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Helper function to generate a room ID
function generateRoomId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Helper function to get players in a room
function getPlayersInRoom(roomId) {
  if (!gameRooms[roomId]) return [];
  
  return Object.values(gameRooms[roomId].players).map(player => ({
    id: player.id,
    color: player.color
  }));
}

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = { app, server };
