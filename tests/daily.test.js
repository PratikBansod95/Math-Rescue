import test from "node:test";
import assert from "node:assert/strict";
import {
  utcDateKey,
  calcDailyScore,
  calcDailyCareerBonus,
  advanceDailyStreak,
  hasCompletedToday,
  dailyPuzzleNumber,
  normalizeDaily,
} from "../public/js/daily.js";
import { createDailyRound, getDailyConfig } from "../public/js/puzzle.js";

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

test("getDailyConfig rotates by weekday", () => {
  const sat = getDailyConfig("2026-08-22");
  const sun = getDailyConfig("2026-08-23");
  assert.equal(sat.label, "Hard mode");
  assert.equal(sat.timer, 60);
  assert.equal(sun.label, "Community day");
});

test("calcDailyScore awards time, stars, and streak", () => {
  const score = calcDailyScore({ stars: 3, secondsLeft: 40, streak: 5 });
  assert.equal(score, 50 + 20 + 20 + 10);
});

test("calcDailyCareerBonus caps at 15 per day", () => {
  const bonus = calcDailyCareerBonus({ stars: 3, weekMilestone: true });
  assert.equal(bonus, 15);
});

test("advanceDailyStreak increments on consecutive days", () => {
  const first = advanceDailyStreak({ lastPlayedDate: "", streak: 0 }, "2026-08-21");
  assert.equal(first.daily.streak, 1);
  const second = advanceDailyStreak(first.daily, "2026-08-22");
  assert.equal(second.daily.streak, 2);
});

test("hasCompletedToday reads profile daily state", () => {
  const daily = normalizeDaily({
    lastPlayedDate: "2026-08-22",
    todayResult: { dateKey: "2026-08-22", submitted: true },
  });
  assert.equal(hasCompletedToday(daily, "2026-08-22"), true);
  assert.equal(hasCompletedToday(daily, "2026-08-23"), false);
});

test("dailyPuzzleNumber increases over time", () => {
  assert.ok(dailyPuzzleNumber("2026-08-22") > dailyPuzzleNumber("2026-01-01"));
});
