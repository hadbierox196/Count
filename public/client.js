// Connect to Socket.io server
const socket = io();

// DOM Elements
const titlePage = document.getElementById('title-page');
const lobbyPage = document.getElementById('lobby-page');
const gamePage = document.getElementById('game-page');
const playButton = document.getElementById('play-button');
const joinButton = document.getElementById('join-button');
const startButton = document.getElementById('start-button');
const roomCodeDisplay = document.getElementById('room-code');
const roomIdInput = document.getElementById('room-id-input');
const playersList = document.getElementById('players-list');
const resultModal = document.getElementById('result-modal');
const resultTitle = document.getElementById('result-title');
const resultMessage = document.getElementById('result-message');
const returnToLobbyBtn = document.getElementById('return-to-lobby');
const errorModal = document.getElementById('error-modal');
const errorMessage = document.getElementById('error-message');
const closeErrorBtn = document.getElementById('close-error');

// Game variables
let myColor = null;
let roomId = null;
let currentSequence = [];
let processingNumber = false;

// Event Listeners
playButton.addEventListener('click', createRoom);
joinButton.addEventListener('click', joinRoom);
startButton.addEventListener('click', startGame);
returnToLobbyBtn.addEventListener('click', returnToLobby);
closeErrorBtn.addEventListener('click', closeErrorModal);

// Functions
function createRoom() {
  socket.emit('createRoom');
}

function joinRoom() {
  const roomCode = roomIdInput.value.trim().toUpperCase();
  if (roomCode) {
    socket.emit('joinRoom', roomCode);
  } else {
    showError('Please enter a room code');
  }
}

function startGame() {
  socket.emit('startGame');
}

function returnToLobby() {
  resultModal.classList.add('hidden');
  gamePage.classList.add('hidden');
  lobbyPage.classList.remove('hidden');
}

function showError(message) {
  errorMessage.textContent = message;
  errorModal.classList.remove('hidden');
}

function closeErrorModal() {
  errorModal.classList.add('hidden');
}

function updatePlayersList(players) {
  playersList.innerHTML = '';
  
  players.forEach(player => {
    const playerItem = document.createElement('div');
    playerItem.className = `player-item player-${player.color}`;
    playerItem.textContent = `Player ${player.color.charAt(0).toUpperCase() + player.color.slice(1)}`;
    playersList.appendChild(playerItem);
  });
  
  if (players.length >= 2) {
    startButton.disabled = false;
  } else {
    startButton.disabled = true;
  }
}

// Socket events
socket.on('roomCreated', (id) => {
  roomId = id;
  titlePage.classList.add('hidden');
  lobbyPage.classList.remove('hidden');
  roomCodeDisplay.textContent = roomId;
});

socket.on('joinedRoom', (data) => {
  roomId = data.roomId;
  myColor = data.color;
  
  titlePage.classList.add('hidden');
  lobbyPage.classList.remove('hidden');
  roomCodeDisplay.textContent = roomId;
  
  updatePlayersList(data.players);
});

socket.on('playerJoined', (data) => {
  updatePlayersList(data.players);
});

socket.on('playerLeft', (data) => {
  updatePlayersList(data.players);
});

socket.on('gameStarted', () => {
  lobbyPage.classList.add('hidden');
  gamePage.classList.remove('hidden');
  
  currentSequence = [];
  updateSequenceDisplay();
  resetNumberButtons();
});

socket.on('updateTimer', (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  document.getElementById('timer').textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
});

socket.on('sequenceUpdated', (data) => {
  currentSequence = data.sequence;
  updateSequenceDisplay(data.selectedBy);
  
  if (processingNumber) {
    processingNumber = false;
    hideDelayIndicator();
  }
  
  updateNumberButtonsState();
});

socket.on('numberProcessing', (data) => {
  processingNumber = true;
  showDelayIndicator(data.number, data.delay);
});

socket.on('playerSelectingNumber', (data) => {
  const button = document.querySelector(`.number-btn[data-number="${data.number}"]`);
  if (button) {
    button.disabled = true;
  }
});

socket.on('gameWon', () => {
  resultTitle.textContent = 'SUCCESS!';
  resultMessage.textContent = 'You completed the sequence correctly!';
  resultModal.classList.remove('hidden');
});

socket.on('gameLost', (data) => {
  resultTitle.textContent = 'GAME OVER';
  resultMessage.textContent = data.reason;
  resultModal.classList.remove('hidden');
});
