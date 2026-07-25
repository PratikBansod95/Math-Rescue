import { createGame } from "./game.js";

const mount = document.querySelector("#app");
if (!mount) {
  throw new Error("MathMaster mount element #app was not found.");
}

createGame({ mount }).start();
