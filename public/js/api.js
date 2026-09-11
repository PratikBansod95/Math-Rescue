const DEFAULT_BASE =
  typeof window !== "undefined" && typeof window.MATH_RESCUE_API === "string"
    ? window.MATH_RESCUE_API.replace(/\/$/, "")
    : "";

const REQUEST_TIMEOUT_MS = 8000;

function apiUrl(path) {
  return `${DEFAULT_BASE}${path}`;
}

function playerAuthorization(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(apiUrl(path), {
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    const failed = new Error(error?.name === "AbortError" ? "Request timed out" : "Network error");
    failed.status = 0;
    throw failed;
  } finally {
    window.clearTimeout(timer);
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.field = data?.field;
    error.data = data;
    throw error;
  }

  return data;
}

export async function registerPlayer(payload, playerToken) {
  const data = await request("/api/players/register", {
    method: "POST",
    headers: playerAuthorization(playerToken),
    body: JSON.stringify(payload),
  });
  return data?.player || null;
}

export async function fetchPlayer(username) {
  const key = encodeURIComponent(String(username || "").trim());
  if (!key) return null;
  try {
    const data = await request(`/api/players/${key}`);
    return data?.player || null;
  } catch (error) {
    if (error.status === 404) return null;
    throw error;
  }
}

export async function savePlayer(profile) {
  const username = profile?.usernameKey || profile?.name;
  const key = encodeURIComponent(String(username || "").trim());
  if (!key) return null;
  const data = await request(`/api/players/${key}`, {
    method: "PUT",
    headers: playerAuthorization(profile.playerToken),
    body: JSON.stringify({
      playerId: profile.playerId,
      name: profile.name,
      unlockedBoard: profile.unlockedBoard,
      bestScore: profile.bestScore,
      bestStars: profile.bestStars,
      boardStars: profile.boardStars || {},
      coins: Math.max(0, Number(profile.coins) || 0),
      tutorialSeen: Boolean(profile.tutorialSeen),
      dailyMeta: profile.daily || {},
    }),
  });
  return data?.player || null;
}

export async function submitDaily(payload, playerToken) {
  const data = await request("/api/daily/submit", {
    method: "POST",
    headers: playerAuthorization(playerToken),
    body: JSON.stringify(payload),
  });
  return data || null;
}

export async function deletePlayer(username, { playerId, playerToken } = {}) {
  const key = encodeURIComponent(String(username || "").trim());
  if (!key) return false;
  const data = await request(`/api/players/${key}`, {
    method: "DELETE",
    headers: playerAuthorization(playerToken),
    body: JSON.stringify({ playerId }),
  });
  return Boolean(data?.deleted);
}

export async function fetchLeaderboard(limit = 10, playerId = "") {
  const params = new URLSearchParams({ limit: String(limit) });
  if (playerId) params.set("playerId", playerId);
  const data = await request(`/api/leaderboard?${params.toString()}`);
  return {
    entries: Array.isArray(data?.entries) ? data.entries : [],
    playerEntry: data?.playerEntry || null,
    limit: Number(data?.limit) || limit,
    fetchedAt: data?.fetchedAt || null,
  };
}

export function remoteToLocalProfile(player) {
  if (!player) return null;
  const dailyMeta = player.dailyMeta && typeof player.dailyMeta === "object" ? player.dailyMeta : {};
  return {
    name: player.name,
    playerId: player.playerId || "",
    bestScore: Number(player.bestScore) || 0,
    unlockedBoard: Math.max(1, Number(player.unlockedBoard) || 1),
    bestStars: Number(player.bestStars) || 0,
    coins: Math.max(0, Number(player.coins) || 0),
    tutorialSeen: Boolean(player.tutorialSeen),
    taskStars: {},
    boardStars: player.boardStars && typeof player.boardStars === "object" ? player.boardStars : {},
    daily: dailyMeta,
    registered: Boolean(player.playerId),
  };
}

export function leaderboardToUi(payload) {
  const entries = payload?.entries || payload || [];
  return entries.map((entry) => ({
    rank: Number(entry.rank) || 0,
    name: entry.name,
    bestScore: Number(entry.bestScore) || 0,
    unlockedBoard: Number(entry.unlockedBoard) || 1,
    bestStars: Number(entry.bestStars) || 0,
    isCurrentPlayer: Boolean(entry.isCurrentPlayer),
  }));
}
