import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyBrainState,
  normalizeBrain,
  computeSkill,
  planNextPuzzle,
  recordBrainRun,
  skillBand,
} from "../public/js/gameBrain.js";
import { createAdaptiveRound, evaluateSubmission } from "../public/js/puzzle.js";

const sampleProfile = {
  unlockedBoard: 6,
  bestScore: 50,
  boardStars: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 1 },
};

test("computeSkill rises with progress", () => {
  const low = computeSkill({ unlockedBoard: 1, boardStars: {} }, emptyBrainState());
  const high = computeSkill(sampleProfile, emptyBrainState());
  assert.ok(high > low);
});

test("planNextPuzzle eases journey retries after fails", () => {
  let brain = emptyBrainState();
  brain = recordBrainRun(
    brain,
    { mode: "journey", levelIndex: 5, ok: false, stars: 1, secondsLeft: 0 },
    sampleProfile,
  );
  brain = recordBrainRun(
    brain,
    { mode: "journey", levelIndex: 5, ok: false, stars: 1, secondsLeft: 0 },
    sampleProfile,
  );
  const plan = planNextPuzzle(sampleProfile, brain, {
    mode: "journey",
    reason: "retry",
    levelIndex: 5,
  });
  assert.equal(plan.pickStyle, "gentle");
  assert.ok(plan.levelIndex <= 5);
});

test("practice plans produce valid unique puzzles", () => {
  const brain = normalizeBrain({ uniqueSeed: 42 });
  const planA = planNextPuzzle(sampleProfile, brain, { mode: "practice", reason: "practice" });
  const planB = planNextPuzzle(sampleProfile, recordBrainRun(brain, {
    mode: "practice",
    levelIndex: planA.levelIndex,
    ok: true,
    stars: 3,
    secondsLeft: 20,
  }, sampleProfile), { mode: "practice", reason: "practice" });

  const roundA = createAdaptiveRound(planA);
  const roundB = createAdaptiveRound(planB);
  assert.notEqual(planA.seed, planB.seed);
  assert.notEqual(planA.puzzleVariant, planB.puzzleVariant);
  assert.equal(evaluateSubmission(roundA.exampleSolution, roundA).ok, true);
  assert.equal(evaluateSubmission(roundB.exampleSolution, roundB).ok, true);
});

test("skillBand maps ranges", () => {
  assert.equal(skillBand(10), "warming up");
  assert.equal(skillBand(50), "steady");
  assert.equal(skillBand(95), "expert");
});
