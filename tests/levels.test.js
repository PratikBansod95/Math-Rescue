import test from "node:test";
import assert from "node:assert/strict";
import { createRound, journeyDifficultyForLevel } from "../public/js/puzzle.js";

function assertWholeNumberCards(round, level) {
  for (const card of round.cards) {
    assert.equal(
      card.denominator,
      1,
      `level ${level} card "${card.label}" should be a whole number`,
    );
    assert.match(card.label, /^\d+$/, `level ${level} card label should look like an integer`);
  }
}

test("journey levels 1-12 stay easy upper-primary", () => {
  for (let level = 1; level <= 12; level += 1) {
    const config = journeyDifficultyForLevel(level);
    assert.equal(config.divisionId, "upper-primary");
    assert.equal(config.difficultyId, "easy");
  }
});

test("level 6 uses whole-number cards and a kid-friendly target", () => {
  const round = createRound({ levelIndex: 6, puzzleVariant: 0 });
  assertWholeNumberCards(round, 6);
  assert.ok(round.target <= 30, `level 6 target should stay small, got ${round.target}`);
  assert.ok(
    !round.cards.some((card) => card.label.includes("/")),
    "level 6 should not include fraction cards",
  );
});

test("journey levels through 25 use whole-number cards only", () => {
  for (let level = 1; level <= 25; level += 1) {
    const round = createRound({ levelIndex: level, puzzleVariant: 0 });
    assertWholeNumberCards(round, level);
  }
});

test("same level and variant always yields the same puzzle", () => {
  const a = createRound({ levelIndex: 7, puzzleVariant: 0 });
  const b = createRound({ levelIndex: 7, puzzleVariant: 0 });
  assert.equal(
    a.cards.map((c) => c.label).join(","),
    b.cards.map((c) => c.label).join(","),
  );
  assert.equal(a.target, b.target);
});

test("retry variant produces a different puzzle for the same level", () => {
  const first = createRound({ levelIndex: 7, puzzleVariant: 0 });
  const retry = createRound({ levelIndex: 7, puzzleVariant: 1 });
  const sameCards =
    first.cards.map((c) => c.label).join(",") ===
    retry.cards.map((c) => c.label).join(",");
  const sameTarget = first.target === retry.target;
  assert.equal(sameCards && sameTarget, false);
});

test("each journey level through 21 generates a valid puzzle", () => {
  for (let level = 1; level <= 21; level += 1) {
    const round = createRound({ levelIndex: level, puzzleVariant: 0 });
    assert.ok(round.cards.length === 4, `level ${level} should have four cards`);
    assert.ok(Number.isFinite(round.target), `level ${level} should have a target`);
  }
});
