const STORAGE_KEY = "math-rescue-v1";
const LEGACY_KEYS = ["mathmaster-v2", "mathmaster-v1"];
const VERSION = 1;

export const DEFAULT_BOARD_LENGTH = 15;

export function defaultSettings() {
  return {
    sound: true,
    boardLength: DEFAULT_BOARD_LENGTH,
  };
}

export function emptyProfile() {
  return {
    bestScore: 0,
    unlockedBoard: 1,
    bestStars: 0,
    tutorialSeen: false,
    taskStars: {},
  };
}

export function normalizeUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 24);
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
        ? lastUsername.trim().slice(0, 24)
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
    lastUsername: typeof data.lastUsername === "string" ? data.lastUsername.trim().slice(0, 24) : "",
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
    boardLength: DEFAULT_BOARD_LENGTH,
  };
}

function normalizeResume(resume) {
  if (!resume || typeof resume !== "object") return null;
  const usernameKey = normalizeUsername(String(resume.usernameKey || ""));
  if (!usernameKey) return null;
  const boardIndex = Number(resume.boardIndex);
  const taskIndex = Number(resume.taskIndex);
  const score = Number(resume.score);
  const runStars = Number(resume.runStars);
  return {
    usernameKey,
    boardIndex: Number.isFinite(boardIndex) ? Math.max(1, boardIndex) : 1,
    taskIndex: Number.isFinite(taskIndex) ? Math.max(1, Math.min(DEFAULT_BOARD_LENGTH, taskIndex)) : 1,
    score: Number.isFinite(score) ? Math.max(0, score) : 0,
    runStars: Number.isFinite(runStars) ? Math.max(0, runStars) : 0,
  };
}

function normalizeProfiles(profiles) {
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) return {};
  const result = {};
  for (const [key, value] of Object.entries(profiles)) {
    const id = normalizeUsername(key);
    if (!id || !value || typeof value !== "object") continue;
    const fresh = emptyProfile();
    result[id] = {
      name:
        typeof value.name === "string" && value.name.trim()
          ? value.name.trim().slice(0, 24)
          : key,
      bestScore: Number.isFinite(value.bestScore) ? Math.max(0, value.bestScore) : 0,
      unlockedBoard: Number.isFinite(value.unlockedBoard)
        ? Math.max(1, value.unlockedBoard)
        : 1,
      bestStars: Number.isFinite(value.bestStars) ? Math.max(0, value.bestStars) : 0,
      tutorialSeen: Boolean(value.tutorialSeen),
      taskStars:
        value.taskStars && typeof value.taskStars === "object" && !Array.isArray(value.taskStars)
          ? value.taskStars
          : fresh.taskStars,
    };
  }
  return result;
}
