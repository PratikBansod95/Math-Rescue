/**
 * Global Challenge — one expert puzzle per UTC date (same for everyone).
 * Uses the tough puzzle bank (fraction tiles as A/B, never decimals on cards).
 */

import { DAILY_CHALLENGE_BANK } from "./data/daily-challenges.data.js";
import {
  createRoundFromSpec,
  createToughProceduralRound,
  evaluateSubmission,
  getDailyConfig,
  hashDailySeed,
} from "./puzzle.js";

const FALLBACK_GLOBAL_SPECS = [
  {
    cards: [{ numerator: 2, denominator: 3 }, 4, 5, 8],
    target: 11,
    solution: "((5 + 2/3) * 2 - 8)",
  },
  {
    cards: [{ numerator: 3, denominator: 4 }, 2, 6, 9],
    target: 12,
    solution: "((9 - 6) * (2 + 3/4) * 2)",
  },
];

function cardSpecHasFraction(value) {
  if (typeof value === "number") return false;
  if (!value || typeof value !== "object") return false;
  return Number(value.denominator) > 1;
}

function specHasFractionTile(spec) {
  return (spec?.cards || []).some(cardSpecHasFraction);
}

/** Expert bank entries — always at least one A/B fraction tile per puzzle. */
function globalChallengePool() {
  const fromBank = DAILY_CHALLENGE_BANK.filter(specHasFractionTile);
  return fromBank.length ? fromBank : FALLBACK_GLOBAL_SPECS;
}

export function dailyRescueIndex(dateKey, poolSize) {
  if (!poolSize) return 0;
  const seed = hashDailySeed(dateKey, 0, "global-challenge", "expert");
  return seed % poolSize;
}

export function dailyRescueVariant(dateKey) {
  return dailyRescueIndex(dateKey, 50000);
}

export function getDailyChallengeSpec(dateKey = "") {
  const pool = globalChallengePool();
  const index = dailyRescueIndex(dateKey, pool.length);
  return pool[index] || pool[0];
}

function normalizeCardValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value && typeof value === "object" && value.numerator != null && value.denominator != null) {
    return { numerator: value.numerator, denominator: value.denominator };
  }
  return 1;
}

function buildGlobalRound(dateKey, spec) {
  const config = getDailyConfig(dateKey);
  const cardValues = (spec?.cards || FALLBACK_GLOBAL_SPECS[0].cards).map(normalizeCardValue);
  return createRoundFromSpec({
    cards: cardValues,
    target: Number(spec?.target) || 24,
    exampleSolution: spec?.solution || FALLBACK_GLOBAL_SPECS[0].solution,
    note: `Global Challenge · ${config.label}`,
    dailyConfig: config,
    dateKey,
  });
}

export function createDailyRescueRound(dateKey) {
  const spec = getDailyChallengeSpec(dateKey);
  let round = buildGlobalRound(dateKey, spec);
  let check = evaluateSubmission(round.exampleSolution, round);
  if (check.ok && round.cards.some((card) => card.denominator > 1)) return round;

  for (let i = 0; i < FALLBACK_GLOBAL_SPECS.length; i += 1) {
    const fallbackSpec = FALLBACK_GLOBAL_SPECS[(dailyRescueIndex(dateKey, 999) + i) % FALLBACK_GLOBAL_SPECS.length];
    round = buildGlobalRound(dateKey, fallbackSpec);
    check = evaluateSubmission(round.exampleSolution, round);
    if (check.ok && round.cards.some((card) => card.denominator > 1)) return round;
  }

  const procedural = createToughProceduralRound(hashDailySeed(dateKey, 0, "global-fallback"));
  return buildGlobalRound(dateKey, {
    cards: procedural.cards.map((card) =>
      card.denominator === 1 ? card.numerator : { numerator: card.numerator, denominator: card.denominator },
    ),
    target: procedural.target,
    solution: procedural.exampleSolution,
  });
}

/** @deprecated use createDailyRescueRound */
export function createDailyRound(dateKey) {
  return createDailyRescueRound(dateKey);
}

export { DAILY_CHALLENGE_BANK };
