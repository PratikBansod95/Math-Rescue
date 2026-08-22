import { getSql } from "./db.js";
import { playerTokenMatches } from "./playerAuth.js";
import {
  ValidationError,
  validateLeaderboardLimit,
  validatePlayerId,
  validatePlayerToken,
} from "./validation.js";

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function validateDateKey(raw) {
  const dateKey = String(raw || "").trim();
  if (!DATE_KEY_RE.test(dateKey)) {
    throw new ValidationError("dateKey must be YYYY-MM-DD.", "dateKey");
  }
  return dateKey;
}

function validateDailyScore(value) {
  const score = Math.floor(Number(value));
  if (!Number.isFinite(score) || score < 0 || score > 500) {
    throw new ValidationError("dailyScore is invalid.", "dailyScore");
  }
  return score;
}

function validateStars(value) {
  const stars = Math.floor(Number(value));
  if (!Number.isFinite(stars) || stars < 1 || stars > 3) {
    throw new ValidationError("stars must be between 1 and 3.", "stars");
  }
  return stars;
}

function validateTimeSeconds(value) {
  const seconds = Math.floor(Number(value));
  if (!Number.isFinite(seconds) || seconds < 0 || seconds > 600) {
    throw new ValidationError("timeSeconds is invalid.", "timeSeconds");
  }
  return seconds;
}

function mapDailyEntry(row, rank, currentPlayerId = "") {
  return {
    rank,
    playerId: row.player_id,
    name: row.display_name,
    usernameKey: row.username_key,
    dailyScore: Number(row.daily_score) || 0,
    stars: Number(row.stars) || 1,
    timeSeconds: Number(row.time_seconds) || 0,
    isCurrentPlayer: Boolean(currentPlayerId && row.player_id === currentPlayerId),
  };
}

export async function getDailyLeaderboard(dateKey, limit = 25, currentPlayerId = "") {
  const safeDate = validateDateKey(dateKey || new Date().toISOString().slice(0, 10));
  const safeLimit = validateLeaderboardLimit(limit);
  const playerId = currentPlayerId ? validatePlayerId(currentPlayerId) : "";
  const sql = getSql();
  const rows = await sql`
    SELECT player_id, username_key, display_name, daily_score, stars, time_seconds, created_at
    FROM daily_results
    WHERE date_key = ${safeDate}
    ORDER BY daily_score DESC, time_seconds ASC, created_at ASC
    LIMIT ${safeLimit}
  `;
  const entries = rows.map((row, index) => mapDailyEntry(row, index + 1, playerId));
  let playerEntry = null;
  if (playerId && !entries.some((entry) => entry.isCurrentPlayer)) {
    const mine = await sql`
      WITH ranked AS (
        SELECT
          player_id,
          username_key,
          display_name,
          daily_score,
          stars,
          time_seconds,
          created_at,
          row_number() OVER (
            ORDER BY daily_score DESC, time_seconds ASC, created_at ASC
          ) AS rank
        FROM daily_results
        WHERE date_key = ${safeDate}
      )
      SELECT player_id, username_key, display_name, daily_score, stars, time_seconds, created_at, rank
      FROM ranked
      WHERE player_id = ${playerId}::uuid
      LIMIT 1
    `;
    if (mine[0]) {
      playerEntry = mapDailyEntry(mine[0], Number(mine[0].rank) || 0, playerId);
    }
  }
  return {
    dateKey: safeDate,
    entries,
    playerEntry,
    limit: safeLimit,
    fetchedAt: new Date().toISOString(),
  };
}

export async function submitDailyResult(body = {}, rawToken = "") {
  if (!body || typeof body !== "object") {
    throw new ValidationError("Request body must be an object.");
  }
  const playerId = validatePlayerId(body.playerId);
  const token = validatePlayerToken(rawToken);
  const dateKey = validateDateKey(body.dateKey);
  const dailyScore = validateDailyScore(body.dailyScore);
  const stars = validateStars(body.stars);
  const timeSeconds = validateTimeSeconds(body.timeSeconds);
  const dailyMeta =
    body.dailyMeta && typeof body.dailyMeta === "object" && !Array.isArray(body.dailyMeta)
      ? body.dailyMeta
      : {};

  const sql = getSql();
  const playerRows = await sql`
    SELECT id, username_key, display_name, auth_token_hash
    FROM players
    WHERE id = ${playerId}::uuid
    LIMIT 1
  `;
  const player = playerRows[0];
  if (!player) {
    throw new ValidationError("Player not found.", undefined, 404);
  }
  if (player.auth_token_hash && !playerTokenMatches(player.auth_token_hash, token)) {
    throw new ValidationError("Player credentials are invalid.", undefined, 401);
  }

  const sql = getSql();
  const existing = await sql`
    SELECT id
    FROM daily_results
    WHERE date_key = ${dateKey} AND player_id = ${playerId}::uuid
    LIMIT 1
  `;
  if (existing[0]) {
    throw new ValidationError("Daily result already submitted for this date.", "dateKey", 409);
  }

  const rows = await sql`
    INSERT INTO daily_results (
      date_key,
      player_id,
      username_key,
      display_name,
      daily_score,
      stars,
      time_seconds
    )
    VALUES (
      ${dateKey},
      ${playerId}::uuid,
      ${player.username_key},
      ${player.display_name},
      ${dailyScore},
      ${stars},
      ${timeSeconds}
    )
    RETURNING player_id, username_key, display_name, daily_score, stars, time_seconds, created_at
  `;

  await sql`
    UPDATE players
    SET
      daily_meta = ${dailyMeta},
      updated_at = now()
    WHERE id = ${playerId}::uuid
  `;

  const rankRows = await sql`
    WITH ranked AS (
      SELECT
        player_id,
        username_key,
        display_name,
        daily_score,
        stars,
        time_seconds,
        created_at,
        row_number() OVER (
          ORDER BY daily_score DESC, time_seconds ASC, created_at ASC
        ) AS rank
      FROM daily_results
      WHERE date_key = ${dateKey}
    )
    SELECT player_id, username_key, display_name, daily_score, stars, time_seconds, created_at, rank
    FROM ranked
    WHERE player_id = ${playerId}::uuid
    LIMIT 1
  `;

  return {
    entry: mapDailyEntry(rows[0], Number(rankRows[0]?.rank) || 0, playerId),
    dateKey,
  };
}
