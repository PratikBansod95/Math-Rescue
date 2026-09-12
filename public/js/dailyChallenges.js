/**
 * Daily Rescue — one global moderate puzzle per UTC date (same for everyone).
 */

import { DAILY_CHALLENGE_BANK } from "./data/daily-challenges.data.js";
import {
  createRoundFromSpec,
  evaluateSubmission,
  getDailyConfig,
  hashDailySeed,
} from "./puzzle.js";

const FALLBACK_RESCUE_SPECS = [
  { cards: [2, 3, 5, 8], target: 24, solution: "((8 - 2) * (5 - 3))" },
  { cards: [3, 4, 6, 9], target: 24, solution: "((9 - 3) * (6 - 4))" },
  { cards: [2, 4, 7, 9], target: 24, solution: "((9 - 7) * (4 + 2))" },
  { cards: [1, 5, 6, 8], target: 24, solution: "((8 - 2) * (6 - 1))" },
  { cards: [3, 5, 7, 10], target: 24, solution: "((10 - 7) * (5 + 3))" },
];

function isWholeNumberCard(value) {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function moderateRescuePool() {
  const fromBank = DAILY_CHALLENGE_BANK.filter((spec) =>
    (spec?.cards || []).every(isWholeNumberCard),
  );
  return fromBank.length ? fromBank : FALLBACK_RESCUE_SPECS;
}

export function dailyRescueIndex(dateKey, poolSize) {
  if (!poolSize) return 0;
  const seed = hashDailySeed(dateKey, 0, "daily-rescue", "moderate");
  return seed % poolSize;
}

export function dailyRescueVariant(dateKey) {
  return dailyRescueIndex(dateKey, 50000);
}

export function getDailyChallengeSpec(dateKey = "") {
  const pool = moderateRescuePool();
  const index = dailyRescueIndex(dateKey, pool.length);
  return pool[index] || pool[0];
}

function normalizeCardValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  return 1;
}

export function createDailyRescueRound(dateKey) {
  const config = getDailyConfig(dateKey);
  const spec = getDailyChallengeSpec(dateKey);
  const cardValues = (spec?.cards || [3, 5, 8, 9]).map(normalizeCardValue);
  const round = createRoundFromSpec({
    cards: cardValues,
    target: Number(spec?.target) || 24,
    exampleSolution: spec?.solution || "((9 - 5) * (8 - 3))",
    note: `Daily Rescue · ${config.label}`,
    dailyConfig: config,
    dateKey,
  });

  const check = evaluateSubmission(round.exampleSolution, round);
  if (check.ok) return round;

  const fallback = FALLBACK_RESCUE_SPECS[dailyRescueIndex(dateKey, FALLBACK_RESCUE_SPECS.length)];
  return createRoundFromSpec({
    cards: fallback.cards,
    target: fallback.target,
    exampleSolution: fallback.solution,
    note: `Daily Rescue · ${config.label}`,
    dailyConfig: config,
    dateKey,
  });
}

/** @deprecated use createDailyRescueRound */
export function createDailyRound(dateKey) {
  return createDailyRescueRound(dateKey);
}

export { DAILY_CHALLENGE_BANK };
