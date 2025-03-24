  import { createActor } from 'xstate';
  import { machine } from './game_copy';
  
  // Get a reference to the HTML element where we want to show the score
  const scoreDisplay = document.getElementById('score-display');
  
  // Create and start the game actor
  const gameActor = createActor(machine);
  
  gameActor.subscribe((state) => {
    console.log('Current state:', state.value);
  
    // Check if we are in the 'showingScore' state
    if (state.matches('showingScore')) {
      const score = state.context.score; // Ensure 'score' exists in context
      if (scoreDisplay) {
        scoreDisplay.textContent = `Your final score: ${score}`;
        scoreDisplay.style.display = 'block';
      }
    }
  });
  
  gameActor.start();

  
  