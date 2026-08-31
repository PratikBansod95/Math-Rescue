import test from "node:test";
import assert from "node:assert/strict";
import { getRank } from "../public/js/puzzle.js";
import {
  POINTS_CORRECT,
  calcTaskStars,
  bestBoardRating,
  levelStarPace,
  calcLevelCoinReward,
} from "../public/js/scoring.js";

test("POINTS_CORRECT is ten per cleared level", () => {
  assert.equal(POINTS_CORRECT, 10);
});

test("calcTaskStars awards 3 only on a clean first solve", () => {
  assert.equal(calcTaskStars({ firstTry: true, usedNudge: false, retriesUsed: 0 }), 3);
  assert.equal(calcTaskStars({ firstTry: false, usedNudge: false, retriesUsed: 1 }), 2);
  assert.equal(calcTaskStars({ firstTry: true, usedNudge: true, retriesUsed: 0 }), 2);
});

test("bestBoardRating returns highest cleared level rating", () => {
  assert.equal(bestBoardRating({ 1: 2, 2: 3, 3: 1 }), 3);
  assert.equal(bestBoardRating({}), 0);
});

test("calcLevelCoinReward awards coins for 2 and 3 star clears", () => {
  assert.equal(calcLevelCoinReward(3), 8);
  assert.equal(calcLevelCoinReward(2), 5);
  assert.equal(calcLevelCoinReward(1), 0);
  assert.equal(calcLevelCoinReward(0), 0);
});

test("levelStarPace maps earned stars to HUD segments", () => {
  assert.equal(levelStarPace(3), 3);
  assert.equal(levelStarPace(2), 2);
  assert.equal(levelStarPace(1), 1);
  assert.equal(levelStarPace(0), 0);
});

test("getRank uses cumulative career score", () => {
  assert.equal(getRank(200).title, "Grand Mastermind");
  assert.equal(getRank(150).title, "Number Wizard");
  assert.equal(getRank(100).title, "Equation Expert");
  assert.equal(getRank(50).title, "Puzzle Apprentice");
});
