import test from "node:test";
import assert from "node:assert/strict";
import {
  utcDateKey,
  calcDailyCareerBonus,
  DAILY_CAREER_BONUS,
  hasCompletedToday,
  markDailyAttempted,
  dailyPuzzleNumber,
  normalizeDaily,
  emptyDailyState,
  buildDailyShareText,
} from "../public/js/daily.js";
import { createDailyRound } from "../public/js/dailyChallenges.js";
import { getDailyConfig, DAILY_CHALLENGE_CONFIG } from "../public/js/puzzle.js";

test("utcDateKey returns YYYY-MM-DD", () => {
  const key = utcDateKey(new Date(Date.UTC(2026, 7, 22, 15, 30)));
  assert.equal(key, "2026-08-22");
});

test("createDailyRound is deterministic for a date", () => {
  const a = createDailyRound("2026-08-22");
  const b = createDailyRound("2026-08-22");
  assert.equal(a.target, b.target);
  assert.deepEqual(
    a.cards.map((card) => card.input),
    b.cards.map((card) => card.input),
  );
});

test("createDailyRound changes across dates", () => {
  const a = createDailyRound("2026-08-22");
  const b = createDailyRound("2026-08-23");
  assert.notEqual(a.target, b.target);
});

test("getDailyConfig always uses the expert challenge", () => {
  const sat = getDailyConfig("2026-08-22");
  const sun = getDailyConfig("2026-08-23");
  assert.deepEqual(sat, DAILY_CHALLENGE_CONFIG);
  assert.deepEqual(sun, DAILY_CHALLENGE_CONFIG);
  assert.equal(sat.label, "Expert challenge");
  assert.equal(sat.timer, 60);
  assert.equal(sat.difficultyId, "medium");
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

test("markDailyAttempted records the UTC date once", () => {
  const first = markDailyAttempted(emptyDailyState(), "2026-08-22");
  assert.equal(first.attemptedDate, "2026-08-22");
  const second = markDailyAttempted(first, "2026-08-22");
  assert.equal(second.attemptedDate, "2026-08-22");
});

test("buildDailyShareText mentions Daily Challenge", () => {
  const text = buildDailyShareText({ succeeded: true, careerBonus: 5, stars: 3, timeSeconds: 42 });
  assert.match(text, /Daily Challenge/);
  assert.match(text, /\+5 career pts/);
});

test("dailyPuzzleNumber increases over time", () => {
  assert.ok(dailyPuzzleNumber("2026-08-22") > dailyPuzzleNumber("2026-01-01"));
});

test("createDailyRound uses the separate tough challenge bank", async () => {
  const { DAILY_CHALLENGE_BANK } = await import("../public/js/dailyChallenges.js");
  const { evaluateSubmission } = await import("../public/js/puzzle.js");
  assert.ok(DAILY_CHALLENGE_BANK.length >= 12);
  const round = createDailyRound("2026-08-22");
  const check = evaluateSubmission(round.exampleSolution, round);
  assert.equal(check.ok, true, check.reason);
  assert.match(round.note || "", /Daily Challenge/);
});
