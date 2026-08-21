import test from "node:test";
import assert from "node:assert/strict";
import { createRound } from "../public/js/puzzle.js";

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
