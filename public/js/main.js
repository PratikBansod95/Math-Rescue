import { createGame } from "./game.js";

const mount = document.querySelector("#app");
if (!mount) {
  throw new Error("Math Rescue mount element #app was not found.");
}

createGame({ mount }).start();
