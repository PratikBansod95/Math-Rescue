/**
 * Rescue Brain — custom game AI for Math Rescue.
 * Tracks player skill, plans puzzle difficulty, and drives unique adaptive equations.
 * Runs entirely in the browser (no API, no downloaded model).
 */

import { DIVISIONS, DIFFICULTIES, hashSeed } from "./puzzle.js";

const MAX_RECENT_RUNS = 24;
const DIFFICULTY_IDS = DIFFICULTIES.map((d) => d.id);
const DIVISION_IDS = DIVISIONS.map((d) => d.id);

export function emptyBrainState() {
  return {
    skill: 12,
    practiceSolved: 0,
    practiceStreak: 0,
    uniqueSeed: 1,
    recentRuns: [],
    lastMessage: "",
  };
}

export function normalizeBrain(value) {
  const base = emptyBrainState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const recentRuns = Array.isArray(value.recentRuns)
    ? value.recentRuns
        .filter((run) => run && typeof run === "object")
        .slice(-MAX_RECENT_RUNS)
        .map(normalizeRun)
    : [];
  return {
    skill: clampSkill(value.skill ?? base.skill),
    practiceSolved: Math.max(0, Number(value.practiceSolved) || 0),
    practiceStreak: Math.max(0, Number(value.practiceStreak) || 0),
    uniqueSeed: Math.max(1, Number(value.uniqueSeed) || 1),
    recentRuns,
    lastMessage: typeof value.lastMessage === "string" ? value.lastMessage : "",
  };
}

function normalizeRun(run) {
  return {
    mode: run.mode === "practice" ? "practice" : "journey",
    levelIndex: Math.max(1, Number(run.levelIndex) || 1),
    ok: Boolean(run.ok),
    stars: Math.max(1, Math.min(3, Number(run.stars) || 1)),
    secondsLeft: Math.max(0, Number(run.secondsLeft) || 0),
    usedHint: Boolean(run.usedHint),
    retriesUsed: Math.max(0, Number(run.retriesUsed) || 0),
    at: Number(run.at) || Date.now(),
  };
}

function clampSkill(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 12;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function buildPlayerSnapshot(profile = {}) {
  const boardStars = profile.boardStars || {};
  const levels = Object.keys(boardStars).map(Number).filter((n) => n >= 1);
  const starValues = levels.map((level) => boardStars[level]);
  const avgStars = starValues.length
    ? starValues.reduce((sum, stars) => sum + stars, 0) / starValues.length
    : 1;
  return {
    unlockedBoard: Math.max(1, Number(profile.unlockedBoard) || 1),
    bestScore: Math.max(0, Number(profile.bestScore) || 0),
    avgStars,
    levelsCleared: levels.length,
  };
}

export function computeSkill(profile = {}, brain = emptyBrainState()) {
  const snap = buildPlayerSnapshot(profile);
  let skill = snap.unlockedBoard * 4 + snap.avgStars * 8 + snap.levelsCleared * 2;

  const recent = brain.recentRuns.slice(-8);
  for (const run of recent) {
    if (run.ok) {
      skill += run.stars >= 3 ? 2 : 1;
    } else {
      skill -= 3;
    }
    if (run.usedHint) skill -= 1;
  }

  return clampSkill(skill);
}

export function skillBand(skill) {
  if (skill < 20) return "warming up";
  if (skill < 40) return "building";
  if (skill < 60) return "steady";
  if (skill < 80) return "sharp";
  return "expert";
}

export function skillToLevel(skill, unlockedBoard = 1) {
  const cap = Math.max(8, unlockedBoard + 4);
  const mapped = 2 + Math.floor(skill / 4.5);
  return Math.max(1, Math.min(cap, mapped));
}

export function skillToDifficulty(skill) {
  if (skill < 18) return "easy";
  if (skill < 35) return "normal";
  if (skill < 55) return "medium";
  if (skill < 75) return "advanced";
  if (skill < 90) return "olympic";
  return "legendary";
}

export function skillToDivision(skill) {
  if (skill < 30) return DIVISION_IDS[0];
  if (skill < 65) return DIVISION_IDS[1];
  return DIVISION_IDS[2];
}

function recentFailsOnLevel(brain, levelIndex) {
  return brain.recentRuns
    .slice(-6)
    .filter((run) => run.mode === "journey" && run.levelIndex === levelIndex && !run.ok).length;
}

function recentPracticeTrend(brain) {
  const practice = brain.recentRuns.filter((run) => run.mode === "practice").slice(-5);
  if (!practice.length) return 0;
  const wins = practice.filter((run) => run.ok).length;
  return wins - (practice.length - wins);
}

export function planNextPuzzle(profile = {}, brain = emptyBrainState(), context = {}) {
  const normalized = normalizeBrain(brain);
  const skill = computeSkill(profile, normalized);
  const mode = context.mode === "practice" ? "practice" : "journey";
  const reason = context.reason || (mode === "practice" ? "practice" : "play");
  const journeyLevel = Math.max(1, Number(context.levelIndex) || profile.unlockedBoard || 1);

  let levelIndex = journeyLevel;
  let pickStyle = "balanced";
  let message = "Rescue Brain picked a puzzle for you.";

  if (mode === "practice") {
    levelIndex = skillToLevel(skill, profile.unlockedBoard || 1);
    const trend = recentPracticeTrend(normalized);
    if (trend >= 2) {
      pickStyle = "tough";
      message = "You're on a roll — cranking up the challenge.";
    } else if (trend <= -1) {
      pickStyle = "gentle";
      message = "Let's rebuild confidence with a cleaner puzzle.";
    } else {
      pickStyle = "balanced";
      message = `Training at ${skillBand(skill)} pace.`;
    }
  } else if (reason === "retry") {
    const fails = recentFailsOnLevel(normalized, journeyLevel);
    levelIndex = Math.max(1, journeyLevel - Math.min(2, fails));
    pickStyle = fails >= 2 ? "gentle" : "balanced";
    message =
      fails >= 2
        ? "Rescue Brain eased this retry — you've got this."
        : "Fresh equation on the same level — try a new path.";
  } else {
    levelIndex = journeyLevel;
    pickStyle = skill > 55 ? "balanced" : "gentle";
  }

  const divisionId = skillToDivision(skill);
  const difficultyId =
    mode === "practice" ? skillToDifficulty(skill) : skillToDifficulty(Math.min(skill, journeyLevel * 5));

  const uniqueSeed = normalized.uniqueSeed;
  const puzzleVariant = uniqueSeed + journeyLevel * 17 + (mode === "practice" ? 9000 : 0);
  const seed = hashSeed(levelIndex, puzzleVariant, divisionId, difficultyId) ^ uniqueSeed;

  return {
    mode,
    reason,
    skill,
    band: skillBand(skill),
    levelIndex,
    puzzleVariant,
    divisionId,
    difficultyId,
    pickStyle,
    seed,
    uniqueSeed,
    message,
  };
}

export function recordBrainRun(brain, run, profile = {}) {
  const next = normalizeBrain(brain);
  const entry = normalizeRun(run);
  next.recentRuns = [...next.recentRuns, entry].slice(-MAX_RECENT_RUNS);
  next.skill = computeSkill(profile, next);

  if (entry.mode === "practice" && entry.ok) {
    next.practiceSolved += 1;
    next.practiceStreak += 1;
  } else if (entry.mode === "practice") {
    next.practiceStreak = 0;
  }

  next.uniqueSeed += 1;
  next.lastMessage = entry.ok
    ? entry.mode === "practice"
      ? "Nice solve — preparing the next unique puzzle."
      : "Good work — skill updated."
    : entry.mode === "practice"
      ? "Tough one — next puzzle will meet you where you are."
      : "Retry tuned to help you crack this level.";

  return next;
}

export function brainStatusText(brain, profile = {}) {
  const normalized = normalizeBrain(brain);
  const skill = computeSkill(profile, normalized);
  const band = skillBand(skill);
  const parts = [`Brain skill ${skill} · ${band}`];
  if (normalized.practiceSolved > 0) {
    parts.push(`${normalized.practiceSolved} practice clears`);
  }
  if (normalized.practiceStreak > 1) {
    parts.push(`${normalized.practiceStreak} streak`);
  }
  return parts.join(" · ");
}
