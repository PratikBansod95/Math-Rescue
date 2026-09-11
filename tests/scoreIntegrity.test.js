import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mergeBestScore,
  mergeCoins,
  sanitizePlayerProgress,
  scoreCap,
  dailyScoreFromResult,
} from "../server/scoreIntegrity.js";

describe("scoreIntegrity", () => {
  it("caps inflated bestScore from client", () => {
    const cap = scoreCap(3, 1);
    assert.equal(mergeBestScore(50, 99999, 3, 1), cap);
  });

  it("allows one level progress per sync", () => {
    const result = sanitizePlayerProgress({
      existing: { unlocked_board: 2, board_stars: { 1: 2 }, best_score: 40, coins: 5 },
      incoming: {
        unlockedBoard: 10,
        boardStars: { 1: 3, 2: 2 },
        bestScore: 500,
        coins: 13,
      },
      dailySuccessCount: 0,
    });
    assert.equal(result.unlockedBoard, 3);
    assert.equal(result.boardStars["2"], 2);
    assert.ok(result.bestScore <= scoreCap(3, 0));
  });

  it("rejects coin inflation beyond progress cap", () => {
    const merged = mergeCoins(5, 999, 2);
    assert.equal(merged, 5);
  });

  it("allows reasonable coin spend per sync", () => {
    assert.equal(mergeCoins(20, 10, 5), 10);
  });

  it("computes daily score server-side", () => {
    assert.equal(dailyScoreFromResult(3, 30, true), 3470);
    assert.equal(dailyScoreFromResult(2, 30, false), 0);
  });
});
