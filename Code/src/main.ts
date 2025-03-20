import "./style.css";
import typescriptLogo from "./typescript.svg";
import viteLogo from "/vite.svg";
import { setupButton } from "./game.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <div class="card">
      <button id="startButton" type="button">Start</button>
    </div>
  </div>
`;

const button = document.querySelector<HTMLButtonElement>("#startButton");
if (button) {
  console.log("✅ Start button found and setting up!");
  setupButton(button);
} else {
  console.error("❌ ERROR: Start button not found in the DOM.");
}
