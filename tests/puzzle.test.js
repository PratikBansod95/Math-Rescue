import { test } from "node:test";
import assert from "node:assert/strict";
import { createRound, evaluateSubmission } from "../public/js/puzzle.js";

test("evaluateSubmission requires all four cards", () => {
  const round = {
    cards: [
      { key: "2", input: "2", value: 2 },
      { key: "4", input: "4", value: 4 },
      { key: "6", input: "6", value: 6 },
      { key: "8", input: "8", value: 8 },
    ],
    target: 6,
  };
  const tooFew = evaluateSubmission("2 + 4", round);
  assert.equal(tooFew.ok, false);
  assert.match(tooFew.reason, /all 4 cards/i);
});

test("evaluateSubmission accepts a valid four-card equation", () => {
  const round = createRound({ levelIndex: 1, puzzleVariant: 0 });
  const result = evaluateSubmission(round.exampleSolution, round);
  assert.equal(result.ok, true, result.reason);
});

test("createRound produces a solvable board-1 puzzle", () => {
  const round = createRound({ levelIndex: 1, puzzleVariant: 0 });
  assert.equal(round.cards.length, 4);
  assert.ok(Number.isFinite(round.target));
  const check = evaluateSubmission(round.exampleSolution, round);
  assert.equal(check.ok, true);
});
