const STORAGE_KEY = "mathmaster-v1";
const VERSION = 1;

export function emptyProfile() {
  return { bestScore: 0, unlockedBoard: 1 };
}

export function normalizeUsername(name) {
  return name.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 24);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { profiles: {}, lastUsername: "" };
    const data = JSON.parse(raw);
    if (data?.version !== VERSION) return { profiles: {}, lastUsername: "" };
    return {
      profiles: normalizeProfiles(data.profiles),
      lastUsername: typeof data.lastUsername === "string" ? data.lastUsername : "",
    };
  } catch {
    return { profiles: {}, lastUsername: "" };
  }
}

export function saveState({ profiles, lastUsername }) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: VERSION,
        profiles: normalizeProfiles(profiles),
        lastUsername: typeof lastUsername === "string" ? lastUsername : "",
      })
    );
  } catch {
    // Ignore quota / private mode failures.
  }
}

function normalizeProfiles(profiles) {
  if (!profiles || typeof profiles !== "object" || Array.isArray(profiles)) return {};
  const result = {};
  for (const [key, value] of Object.entries(profiles)) {
    const id = normalizeUsername(key);
    if (!id || !value || typeof value !== "object") continue;
    result[id] = {
      name:
        typeof value.name === "string" && value.name.trim()
          ? value.name.trim().slice(0, 24)
          : key,
      bestScore: Number.isFinite(value.bestScore) ? Math.max(0, value.bestScore) : 0,
      unlockedBoard: Number.isFinite(value.unlockedBoard)
        ? Math.max(1, value.unlockedBoard)
        : 1,
    };
  }
  return result;
}
