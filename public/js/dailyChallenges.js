/**
 * Daily Challenge puzzle bank — separate from journey generation.
 * Puzzles are curated / pre-generated tough equations, rotated by UTC date.
 */

import { DAILY_CHALLENGE_BANK } from "./data/daily-challenges.data.js";
import {
  createRoundFromSpec,
  evaluateSubmission,
  getDailyConfig,
  hashDailySeed,
} from "./puzzle.js";

export { DAILY_CHALLENGE_BANK };

export function dailyChallengeIndex(dateKey, bankSize = DAILY_CHALLENGE_BANK.length) {
  if (!bankSize) return 0;
  const seed = hashDailySeed(dateKey, 0, "daily-challenge", "bank");
  return seed % bankSize;
}

export function getDailyChallengeSpec(dateKey = "") {
  const bank = DAILY_CHALLENGE_BANK;
  if (!bank.length) return null;
  const index = dailyChallengeIndex(dateKey, bank.length);
  return bank[index] || bank[0];
}

function normalizeCardValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && value.numerator != null && value.denominator != null) {
    return { numerator: Number(value.numerator), denominator: Number(value.denominator) };
  }
  return 1;
}

export function createDailyRound(dateKey) {
  const config = getDailyConfig(dateKey);
  const spec = getDailyChallengeSpec(dateKey);
  const cardValues = (spec?.cards || [3, 5, 8, 9]).map(normalizeCardValue);
  const round = createRoundFromSpec({
    cards: cardValues,
    target: Number(spec?.target) || 24,
    exampleSolution: spec?.solution || "((9 - 5) * (8 - 3))",
    note: `Daily Challenge · ${config.label}`,
    dailyConfig: config,
    dateKey,
  });

  const check = evaluateSubmission(round.exampleSolution, round);
  if (!check.ok) {
    return createRoundFromSpec({
      cards: [2, 3, 5, { numerator: 3, denominator: 4 }],
      target: 11,
      exampleSolution: "((5 + 3/4) * 2 - 3)",
      note: `Daily Challenge · ${config.label}`,
      dailyConfig: config,
      dateKey,
    });
  }

  return round;
}
