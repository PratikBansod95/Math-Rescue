import { bestBoardRating } from "./scoring.js";
import { ensurePlayerIdentity } from "./playerIdentity.js";
import { MAX_NICKNAME_LENGTH, normalizeNicknameKey } from "./nicknameValidation.js";
import { emptyDailyState, normalizeDaily } from "./daily.js";

const STORAGE_KEY = "math-rescue-v1";
const LEGACY_KEYS = ["mathmaster-v2", "mathmaster-v1"];
const VERSION = 1;

export function defaultSettings() {
  return {
    sound: true,
  };
}

export function emptyProfile() {
  return ensurePlayerIdentity({
    bestScore: 0,
    unlockedBoard: 1,
    bestStars: 0,
    tutorialSeen: false,
    taskStars: {},
    boardStars: {},
    registered: false,
    daily: emptyDailyState(),
  });
}

export function normalizeUsername(name) {
  return normalizeNicknameKey(name).slice(0, MAX_NICKNAME_LENGTH);
}

export function clearAllState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    for (const key of LEGACY_KEYS) {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore private mode / quota errors.
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data?.version === VERSION) {
        return normalizeSave(data);
      }
    }

    // Migrate older MathMaster saves if present
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const data = JSON.parse(legacy);
      const migrated = normalizeSave({
        ...data,
        version: VERSION,
        resume: null,
      });
      saveState(migrated);
      return migrated;
    }
  } catch {
    // fall through
  }
  return emptySave();
}

export function saveState({ profiles, lastUsername, settings, resume }) {
  try {
    const previous = safeReadRaw();
    const nextUsername =
      typeof lastUsername === "string" && lastUsername.trim()
        ? lastUsername.trim().slice(0, 8)
        : previous?.lastUsername || "";

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        profiles: normalizeProfiles(profiles),
        lastUsername: nextUsername,
        settings: normalizeSettings(settings),
        resume: normalizeResume(resume === undefined ? previous?.resume : resume),
      })
    );
  } catch {
    // Ignore quota / private mode failures.
  }
}

export function topProfilesByScore(profiles, limit = 5) {
  return Object.values(profiles)
    .slice()
    .sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0))
    .slice(0, limit);
}

function emptySave() {
  return {
    profiles: {},
    lastUsername: "",
    settings: defaultSettings(),
    resume: null,
  };
}

function normalizeSave(data) {
  return {
    profiles: normalizeProfiles(data.profiles),
    lastUsername: typeof data.lastUsername === "string" ? data.lastUsername.trim().slice(0, 8) : "",
    settings: normalizeSettings(data.settings),
    resume: normalizeResume(data.resume),
  };
}

function safeReadRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.version === VERSION ? normalizeSave(data) : null;
  } catch {
    return null;
  }
}

function normalizeSettings(settings) {
  const base = defaultSettings();
  if (!settings || typeof settings !== "object") return base;
  return {
    sound: settings.sound !== false,
  };
}

function normalizeResume(resume) {
  if (!resume || typeof resume !== "object") return null;
  const usernameKey = normalizeUsername(String(resume.usernameKey || ""));
  if (!usernameKey) return null;
  const levelIndex = Number(resume.levelIndex ?? resume.boardIndex);
  const puzzleVariant = Number(resume.puzzleVariant);
  const score = Number(resume.score);
  const runStars = Number(resume.runStars);
  return {
    usernameKey,
    levelIndex: Number.isFinite(levelIndex) ? Math.max(1, levelIndex) : 1,
    puzzleVariant:
      Number.isFinite(puzzleVariant) && puzzleVariant >= 0
        ? puzzleVariant
        : Math.max(0, (Number(resume.taskIndex) || 1) - 1),
    score: Number.isFinite(score) ? Math.max(0, score) : 0,
    runStars: Number.isFinite(runStars) ? Math.max(0, runStars) : 0,
  };
}

function normalizeBoardStars(value, fallback = {}) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...fallback };
  const result = {};
  for (const [key, stars] of Object.entries(value)) {
    const board = Number(key);
    const n = Number(stars);
    if (!Number.isFinite(board) || board < 1) continue;
    if (!Number.isFinite(n) || n < 1) continue;
    result[String(Math.floor(board))] = Math.max(1, Math.min(3, Math.floor(n)));
  }
  return result;
}

function normalizeProfiles(profiles) {
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) return {};
  const result = {};
  for (const [key, value] of Object.entries(profiles)) {
    const id = normalizeUsername(key);
    if (!id || !value || typeof value !== "object") continue;
    const fresh = emptyProfile();
    const boardStars = normalizeBoardStars(value.boardStars, fresh.boardStars);
    result[id] = ensurePlayerIdentity({
      name:
        typeof value.name === "string" && value.name.trim()
          ? value.name.trim().slice(0, MAX_NICKNAME_LENGTH)
          : key,
      bestScore: Number.isFinite(value.bestScore) ? Math.max(0, value.bestScore) : 0,
      unlockedBoard: Number.isFinite(value.unlockedBoard)
        ? Math.max(1, value.unlockedBoard)
        : 1,
      bestStars: bestBoardRating(boardStars),
      tutorialSeen: Boolean(value.tutorialSeen),
      taskStars:
        value.taskStars && typeof value.taskStars === "object" && !Array.isArray(value.taskStars)
          ? value.taskStars
          : fresh.taskStars,
      boardStars,
      daily: normalizeDaily(value.daily),
      playerId: value.playerId,
      playerToken: value.playerToken,
      registered: Boolean(value.registered),
    });
  }
  return result;
}
