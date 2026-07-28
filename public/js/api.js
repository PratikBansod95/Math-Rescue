const DEFAULT_BASE =
  typeof window !== "undefined" && typeof window.MATH_RESCUE_API === "string"
    ? window.MATH_RESCUE_API.replace(/\/$/, "")
    : "";

function apiUrl(path) {
  return `${DEFAULT_BASE}${path}`;
}

async function request(path, options = {}) {
  const response = await fetch(apiUrl(path), {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error = new Error(data?.error || `Request failed (${response.status})`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
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
    body: JSON.stringify({
      name: profile.name,
      unlockedBoard: profile.unlockedBoard,
      bestScore: profile.bestScore,
      bestStars: profile.bestStars,
      boardStars: profile.boardStars || {},
      tutorialSeen: Boolean(profile.tutorialSeen),
    }),
  });
  return data?.player || null;
}

export async function fetchLeaderboard(limit = 10) {
  const data = await request(`/api/leaderboard?limit=${encodeURIComponent(String(limit))}`);
  return Array.isArray(data?.players) ? data.players : [];
}

export function remoteToLocalProfile(player) {
  if (!player) return null;
  return {
    name: player.name,
    bestScore: Number(player.bestScore) || 0,
    unlockedBoard: Math.max(1, Number(player.unlockedBoard) || 1),
    bestStars: Number(player.bestStars) || 0,
    tutorialSeen: Boolean(player.tutorialSeen),
    taskStars: {},
    boardStars: player.boardStars && typeof player.boardStars === "object" ? player.boardStars : {},
  };
}

export function leaderboardToUi(players) {
  return (players || []).map((player) => ({
    name: player.name,
    bestScore: Number(player.bestScore) || 0,
    unlockedBoard: Number(player.unlockedBoard) || 1,
    bestStars: Number(player.bestStars) || 0,
  }));
}
