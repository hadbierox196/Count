// server/utils.js

/**
 * Format time in seconds to MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

/**
 * Generate a random delay between min and max seconds
 * @param {number} min - Minimum seconds
 * @param {number} max - Maximum seconds
 * @returns {number} Random delay in seconds
 */
function generateRandomDelay(min = 1, max = 15) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  formatTime,
  generateRandomDelay
};
