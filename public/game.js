// Game UI Functions
const sequenceDisplay = document.getElementById('sequence');
const delayIndicator = document.getElementById('delay-indicator');
const progressCircle = document.getElementById('progress-circle');
const progressNumber = document.getElementById('progress-number');
const numberButtons = document.querySelectorAll('.number-btn');

// Add event listeners to number buttons
numberButtons.forEach(button => {
  button.addEventListener('click', () => {
    if (!button.disabled && !processingNumber) {
      const number = button.dataset.number;
      socket.emit('selectNumber', number);
      
      // Disable all buttons temporarily until the server responds
      numberButtons.forEach(btn => {
        btn.disabled = true;
      });
      
      // Add animation class to the clicked button
      button.classList.add('processing');
    }
  });
});

function updateSequenceDisplay(selectedBy = null) {
  sequenceDisplay.innerHTML = '';
  
  currentSequence.forEach(number => {
    const numberElement = document.createElement('div');
    numberElement.className = 'sequence-number';
    numberElement.textContent = number;
    
    // If this is the last added number and we know who selected it, use their color
    if (number === currentSequence[currentSequence.length - 1] && selectedBy) {
      numberElement.style.backgroundColor = selectedBy;
    } else {
      numberElement.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
    }
    
    sequenceDisplay.appendChild(numberElement);
  });
}

function updateNumberButtonsState() {
  // Enable all buttons initially
  numberButtons.forEach(button => {
    button.disabled = false;
    button.classList.remove('processing');
  });
  
  // Disable buttons that are already in the sequence
  currentSequence.forEach(number => {
    const button = document.querySelector(`.number-btn[data-number="${number}"]`);
    if (button) {
      button.disabled = true;
    }
  });
  
  // If the last player was me, disable consecutive numbers
  if (processingNumber) {
    // All buttons should be disabled when processing
    numberButtons.forEach(button => {
      button.disabled = true;
    });
  }
  
  // Special case: if the next expected number is not valid, disable all buttons
  if (currentSequence.length === 10) {
    numberButtons.forEach(button => {
      button.disabled = true;
    });
  }
}

function resetNumberButtons() {
  numberButtons.forEach(button => {
    button.disabled = false;
    button.classList.remove('processing');
  });
}

function showDelayIndicator(number, delay) {
  // Show the delay indicator with the selected number
  progressNumber.textContent = number;
  delayIndicator.classList.remove('hidden');
  
  // Calculate the circumference of the circle
  const circleCircumference = 2 * Math.PI * 65; // radius is 65px
  
  // Set initial position (full circle)
  progressCircle.style.strokeDasharray = circleCircumference;
  progressCircle.style.strokeDashoffset = circleCircumference;
  
  // Animate the countdown
  let timeLeft = delay;
  const totalTime = delay;
  const interval = 10; // Update every 10ms for smoother animation
  
  const countdownInterval = setInterval(() => {
    timeLeft -= interval / 1000;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      return;
    }
    
    // Update the progress circle
    const fraction = timeLeft / totalTime;
    const strokeDashoffset = circleCircumference * fraction;
    progressCircle.style.strokeDashoffset = strokeDashoffset;
  }, interval);
}

function hideDelayIndicator() {
  delayIndicator.classList.add('hidden');
  
  // Re-enable buttons according to game state
  updateNumberButtonsState();
}
