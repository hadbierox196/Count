// server/game.js

/**
 * Create a new game instance
 * @returns {Object} Game state object
 */
function createGame() {
  return {
    active: false,
    players: {},
    sequence: [],
    timeLeft: 120, // 2 minutes in seconds
    timer: null
  };
}

/**
 * Join an existing game
 * @param {Object} gameState - The current game state
 * @param {string} playerId - The ID of the joining player
 * @param {string} playerColor - The color assigned to the player
 * @returns {boolean} Success of joining
 */
function joinGame(gameState, playerId, playerColor) {
  // Check if the game is already full
  if (Object.keys(gameState.players).length >= 4) {
    return false;
  }
  
  // Add player to the game
  gameState.players[playerId] = {
    id: playerId,
    color: playerColor,
    canSelectConsecutive: false,
    lastSelected: null
  };
  
  return true;
}

/**
 * Start the game
 * @param {Object} gameState - The current game state
 */
function startGame(gameState) {
  gameState.active = true;
  gameState.sequence = [];
  gameState.timeLeft = 120; // Reset timer to 2 minutes
}

/**
 * Process a player's number selection
 * @param {Object} gameState - The current game state
 * @param {string} playerId - The ID of the player making the selection
 * @param {number} number - The number selected
 * @returns {boolean} Success of the selection
 */
function processNumberSelection(gameState, playerId, number) {
  // Check if the game is active
  if (!gameState.active) {
    return false;
  }
  
  // Add the number to the sequence
  gameState.sequence.push(number);
  
  return true;
}

/**
 * End the game
 * @param {Object} gameState - The current game state
 * @param {boolean} won - Whether the game was won or lost
 */
function endGame(gameState, won) {
  gameState.active = false;
  
  // Clear the timer if it exists
  if (gameState.timer) {
    clearInterval(gameState.timer);
    gameState.timer = null;
  }
}

module.exports = {
  createGame,
  joinGame,
  startGame,
  processNumberSelection,
  endGame
};
