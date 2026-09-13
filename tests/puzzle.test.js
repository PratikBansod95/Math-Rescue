import { test } from "node:test";
import assert from "node:assert/strict";
import { createRound, evaluateSubmission, getUsedCardIndices, getUsedCardIndicesFromParts } from "../public/js/puzzle.js";

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

test("getUsedCardIndices marks duplicate card slots independently", () => {
  const cards = [
    { key: "3", input: "3", value: 3 },
    { key: "3", input: "3", value: 3 },
    { key: "5", input: "5", value: 5 },
    { key: "7", input: "7", value: 7 },
  ];
  const once = getUsedCardIndices("3", cards);
  assert.equal(once.size, 1);
  const twice = getUsedCardIndices("3 + 3", cards);
  assert.equal(twice.size, 2);
});

test("getUsedCardIndicesFromParts uses the card slot that was tapped", () => {
  const parts = [{ kind: "card", index: 2, input: "3" }];
  const used = getUsedCardIndicesFromParts(parts);
  assert.equal(used.size, 1);
  assert.ok(used.has(2));
  assert.equal(!used.has(0), true);
});
