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
        return {
          profiles: normalizeProfiles(data.profiles),
          lastUsername: typeof data.lastUsername === "string" ? data.lastUsername : "",
          settings: normalizeSettings(data.settings),
        };
      }
    }

    // Migrate older MathMaster saves if present
    for (const key of LEGACY_KEYS) {
      const legacy = localStorage.getItem(key);
      if (!legacy) continue;
      const data = JSON.parse(legacy);
      const migrated = {
        profiles: normalizeProfiles(data.profiles),
        lastUsername: typeof data.lastUsername === "string" ? data.lastUsername : "",
        settings: normalizeSettings(data.settings),
      };
      saveState(migrated);
      return migrated;
    }
  } catch {
    // fall through
  }
  return { profiles: {}, lastUsername: "", settings: defaultSettings() };
}

export function saveState({ profiles, lastUsername, settings }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        profiles: normalizeProfiles(profiles),
        lastUsername: typeof lastUsername === "string" ? lastUsername : "",
        settings: normalizeSettings(settings),
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

function normalizeSettings(settings) {
  const base = defaultSettings();
  if (!settings || typeof settings !== "object") return base;
  return {
    sound: settings.sound !== false,
    boardLength: DEFAULT_BOARD_LENGTH,
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
