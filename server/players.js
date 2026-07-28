import {
  getSql,
  normalizeUsername,
  clampDisplayName,
  mergeBoardStars,
  rowToPlayer,
} from "./db.js";

export async function getPlayerByUsername(username) {
  const key = normalizeUsername(username);
  if (!key) return null;
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM players
    WHERE username_key = ${key}
    LIMIT 1
  `;
  return rowToPlayer(rows[0] || null);
}

export async function upsertPlayer(username, body = {}) {
  const key = normalizeUsername(username);
  if (!key) {
    const error = new Error("Username is required");
    error.status = 400;
    throw error;
  }

  const displayName = clampDisplayName(body.name || body.displayName || username, key);
  const unlockedBoard = Math.max(1, Math.floor(Number(body.unlockedBoard) || 1));
  const bestScore = Math.max(0, Math.floor(Number(body.bestScore) || 0));
  const bestStars = Math.max(0, Math.floor(Number(body.bestStars) || 0));
  const tutorialSeen = Boolean(body.tutorialSeen);
  const incomingStars = body.boardStars || {};

  const sql = getSql();
  const existingRows = await sql`
    SELECT *
    FROM players
    WHERE username_key = ${key}
    LIMIT 1
  `;
  const existing = existingRows[0] || null;

  if (!existing) {
    const rows = await sql`
      INSERT INTO players (
        username_key,
        display_name,
        unlocked_board,
        best_score,
        best_stars,
        board_stars,
        tutorial_seen
      )
      VALUES (
        ${key},
        ${displayName},
        ${unlockedBoard},
        ${bestScore},
        ${bestStars},
        ${mergeBoardStars({}, incomingStars)},
        ${tutorialSeen}
      )
      RETURNING *
    `;
    return rowToPlayer(rows[0]);
  }

  const mergedStars = mergeBoardStars(existing.board_stars || {}, incomingStars);
  const rows = await sql`
    UPDATE players
    SET
      display_name = ${displayName},
      unlocked_board = ${Math.max(Number(existing.unlocked_board) || 1, unlockedBoard)},
      best_score = ${Math.max(Number(existing.best_score) || 0, bestScore)},
      best_stars = ${Math.max(Number(existing.best_stars) || 0, bestStars)},
      board_stars = ${mergedStars},
      tutorial_seen = ${Boolean(existing.tutorial_seen) || tutorialSeen},
      updated_at = now()
    WHERE username_key = ${key}
    RETURNING *
  `;
  return rowToPlayer(rows[0]);
}

export async function getLeaderboard(limit = 10) {
  const safeLimit = Math.max(1, Math.min(50, Math.floor(Number(limit) || 10)));
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM players
    WHERE best_score > 0
    ORDER BY best_score DESC, updated_at DESC
    LIMIT ${safeLimit}
  `;
  return rows.map(rowToPlayer);
}

export async function pingDb() {
  const sql = getSql();
  const rows = await sql`SELECT 1 AS ok`;
  return Number(rows[0]?.ok) === 1;
}
