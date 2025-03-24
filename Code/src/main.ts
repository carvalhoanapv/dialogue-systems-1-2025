/* import "./style.css";
import { setupButton } from "./game_mau";

// Set up the main application UI

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="speakButton" type="button">Speak</button>
    </div>
  </div>
`;

const speakButton = document.querySelector<HTMLButtonElement>("#speakButton");

if (speakButton) {
  console.log("Speak button found and setting up!");
  speakButton.addEventListener("click", () => {
    console.log("Bot is now listening...");
    setupButton(speakButton); // Ensures the bot listens when Speak is clicked
  });
} else {
  console.error("ERROR: Speak button not found in the DOM.");
} */

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

  
  