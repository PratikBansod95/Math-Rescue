import test from "node:test";
import assert from "node:assert/strict";
import {
  utcDateKey,
  calcDailyCareerBonus,
  DAILY_CAREER_BONUS,
  hasCompletedToday,
  markDailyAttempted,
  rescueNumber,
  normalizeDaily,
  emptyDailyState,
  buildDailyShareText,
  buildChaseTrackBar,
  recordRescueOutcome,
  reconcileRescueStreak,
  formatRescueCountdown,
  computeEscapeMetrics,
} from "../public/js/daily.js";
import { createDailyRescueRound } from "../public/js/dailyChallenges.js";
import { getDailyConfig, DAILY_CHALLENGE_CONFIG } from "../public/js/puzzle.js";

test("utcDateKey returns YYYY-MM-DD", () => {
  const key = utcDateKey(new Date(Date.UTC(2026, 7, 22, 15, 30)));
  assert.equal(key, "2026-08-22");
});

test("createDailyRescueRound is deterministic for a date", () => {
  const a = createDailyRescueRound("2026-08-22");
  const b = createDailyRescueRound("2026-08-22");
  assert.equal(a.target, b.target);
  assert.deepEqual(
    a.cards.map((card) => card.input),
    b.cards.map((card) => card.input),
  );
});

test("createDailyRescueRound changes across dates", () => {
  const a = createDailyRescueRound("2026-08-22");
  const b = createDailyRescueRound("2026-08-23");
  const sameTarget = a.target === b.target;
  const sameCards =
    JSON.stringify(a.cards.map((c) => c.input)) ===
    JSON.stringify(b.cards.map((c) => c.input));
  assert.equal(sameTarget && sameCards, false);
});

test("getDailyConfig uses expert global challenge settings", () => {
  const sat = getDailyConfig("2026-08-22");
  assert.equal(sat.label, DAILY_CHALLENGE_CONFIG.label);
  assert.equal(sat.timer, 90);
  assert.equal(sat.difficultyId, "advanced");
});

test("createDailyRescueRound includes at least one fraction tile", () => {
  const round = createDailyRescueRound("2026-09-12");
  assert.ok(round.cards.some((card) => card.denominator > 1));
  for (const card of round.cards) {
    if (card.denominator > 1) {
      assert.match(card.label, /^\d+\/\d+$/);
    }
  }
});

test("calcDailyCareerBonus awards 5 only on success", () => {
  assert.equal(calcDailyCareerBonus(true), DAILY_CAREER_BONUS);
  assert.equal(calcDailyCareerBonus(false), 0);
});

test("hasCompletedToday locks after any attempt today", () => {
  const daily = normalizeDaily({
    attemptedDate: "2026-08-22",
  });
  assert.equal(hasCompletedToday(daily, "2026-08-22"), true);
  assert.equal(hasCompletedToday(daily, "2026-08-23"), false);
});

test("recordRescueOutcome increments streak on consecutive success days", () => {
  const first = recordRescueOutcome(emptyDailyState(), {
    dateKey: "2026-08-21",
    succeeded: true,
    timeSeconds: 40,
    operationCount: 3,
    timerLimit: 75,
  });
  assert.equal(first.rescueStreak, 1);
  const second = recordRescueOutcome(first, {
    dateKey: "2026-08-22",
    succeeded: true,
    timeSeconds: 35,
    operationCount: 2,
    timerLimit: 75,
  });
  assert.equal(second.rescueStreak, 2);
});

test("reconcileRescueStreak resets after missing a day", () => {
  const stale = normalizeDaily({
    lastSuccessDate: "2026-08-20",
    rescueStreak: 4,
  });
  const fixed = reconcileRescueStreak(stale, "2026-08-22");
  assert.equal(fixed.rescueStreak, 0);
});

test("buildDailyShareText uses chase track without spoilers", () => {
  const metrics = computeEscapeMetrics({
    succeeded: true,
    timeSeconds: 52,
    timerLimit: 75,
    operationCount: 3,
  });
  const text = buildDailyShareText({
    dateKey: "2026-08-22",
    succeeded: true,
    timeSeconds: 52,
    operationCount: 3,
    escapePercent: metrics.escapePercent,
    rescueStreak: 2,
    metrics,
  });
  assert.match(text, /Rescue #/);
  assert.match(text, /escaped by \d+%/);
  assert.match(text, /0:52/);
  assert.match(text, /3 ops/);
  assert.match(text, /🐱/);
  assert.match(text, /🦈/);
  assert.doesNotMatch(text, /\+/);
});

test("formatRescueCountdown uses HH:MM:SS", () => {
  assert.match(formatRescueCountdown(3661000), /^\d{2}:\d{2}:\d{2}$/);
});

test("rescueNumber starts at 1 on launch day and increments", () => {
  assert.equal(rescueNumber("2026-09-12"), 1);
  assert.equal(rescueNumber("2026-09-13"), 2);
  assert.ok(rescueNumber("2026-09-12") < rescueNumber("2026-09-14"));
});

test("createDailyRescueRound is solvable", async () => {
  const { evaluateSubmission } = await import("../public/js/puzzle.js");
  const round = createDailyRescueRound("2026-08-22");
  const check = evaluateSubmission(round.exampleSolution, round);
  assert.equal(check.ok, true, check.reason);
  assert.match(round.note || "", /Global Challenge/);
});
