import {
  getSql,
  normalizeUsername,
  clampDisplayName,
  mergeBoardStars,
  rowToPlayer,
} from "./db.js";
import { hashPlayerToken, playerTokenMatches } from "./playerAuth.js";
import {
  ValidationError,
  normalizeNicknameKey,
  validateLeaderboardLimit,
  validateNickname,
  validatePlayerId,
  validatePlayerToken,
  validateRegisterBody,
} from "./validation.js";

function mapLeaderboardEntry(row, rank, currentPlayerId = "") {
  return {
    rank,
    playerId: row.id,
    name: row.display_name,
    usernameKey: row.username_key,
    bestScore: Number(row.best_score) || 0,
    unlockedBoard: Number(row.unlocked_board) || 1,
    bestStars: Number(row.best_stars) || 0,
    isCurrentPlayer: Boolean(currentPlayerId && row.id === currentPlayerId),
  };
}

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

export async function getPlayerById(playerId) {
  const id = validatePlayerId(playerId);
  const sql = getSql();
  const rows = await sql`
    SELECT *
    FROM players
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  return rowToPlayer(rows[0] || null);
}

export async function registerPlayer(body, rawToken) {
  const request = validateRegisterBody(body);
  const token = validatePlayerToken(rawToken);
  const nicknameKey = normalizeNicknameKey(request.nickname);
  const displayName = validateNickname(request.nickname);
  const tokenHash = hashPlayerToken(token);
  const sql = getSql();

  const existingById = await sql`
    SELECT *
    FROM players
    WHERE id = ${request.playerId}::uuid
    LIMIT 1
  `;
  const existingPlayer = existingById[0] || null;

  if (existingPlayer?.auth_token_hash && !playerTokenMatches(existingPlayer.auth_token_hash, token)) {
    throw new ValidationError("Player credentials are invalid.", undefined, 401);
  }

  const existingByName = await sql`
    SELECT *
    FROM players
    WHERE username_key = ${nicknameKey}
    LIMIT 1
  `;
  const nameOwner = existingByName[0] || null;

  if (nameOwner && nameOwner.id !== request.playerId) {
    throw new ValidationError("That nickname is already taken.", "nickname", 409);
  }

  const unlockedBoard = Math.max(1, request.localUnlockedBoard || 1);
  const bestScore = Math.max(0, request.localBestScore || 0);
  const bestStars = Math.min(3, Math.max(0, request.localBestStars || 0));
  const boardStars = mergeBoardStars({}, request.localBoardStars || {});
  const tutorialSeen = Boolean(request.localTutorialSeen);

  let row;
  if (existingPlayer) {
    const mergedStars = mergeBoardStars(existingPlayer.board_stars || {}, boardStars);
    const rows = await sql`
      UPDATE players
      SET
        username_key = ${nicknameKey},
        display_name = ${displayName},
        auth_token_hash = ${tokenHash},
        unlocked_board = ${Math.max(Number(existingPlayer.unlocked_board) || 1, unlockedBoard)},
        best_score = ${Math.max(Number(existingPlayer.best_score) || 0, bestScore)},
        best_stars = ${Math.min(3, Math.max(Number(existingPlayer.best_stars) || 0, bestStars))},
        board_stars = ${mergedStars},
        tutorial_seen = ${Boolean(existingPlayer.tutorial_seen) || tutorialSeen},
        updated_at = now()
      WHERE id = ${request.playerId}::uuid
      RETURNING *
    `;
    row = rows[0];
  } else if (nameOwner && nameOwner.id === request.playerId) {
    const mergedStars = mergeBoardStars(nameOwner.board_stars || {}, boardStars);
    const rows = await sql`
      UPDATE players
      SET
        display_name = ${displayName},
        auth_token_hash = ${tokenHash},
        unlocked_board = ${Math.max(Number(nameOwner.unlocked_board) || 1, unlockedBoard)},
        best_score = ${Math.max(Number(nameOwner.best_score) || 0, bestScore)},
        best_stars = ${Math.min(3, Math.max(Number(nameOwner.best_stars) || 0, bestStars))},
        board_stars = ${mergedStars},
        tutorial_seen = ${Boolean(nameOwner.tutorial_seen) || tutorialSeen},
        updated_at = now()
      WHERE id = ${nameOwner.id}::uuid
      RETURNING *
    `;
    row = rows[0];
  } else {
    const rows = await sql`
      INSERT INTO players (
        id,
        username_key,
        display_name,
        auth_token_hash,
        unlocked_board,
        best_score,
        best_stars,
        board_stars,
        tutorial_seen
      )
      VALUES (
        ${request.playerId}::uuid,
        ${nicknameKey},
        ${displayName},
        ${tokenHash},
        ${unlockedBoard},
        ${bestScore},
        ${bestStars},
        ${boardStars},
        ${tutorialSeen}
      )
      RETURNING *
    `;
    row = rows[0];
  }

  return rowToPlayer(row);
}

export async function upsertPlayer(username, body = {}, rawToken = "") {
  const key = normalizeUsername(username);
  if (!key) {
    const error = new Error("Username is required");
    error.status = 400;
    throw error;
  }

  const displayName = clampDisplayName(body.name || body.displayName || username, key);
  const unlockedBoard = Math.max(1, Math.floor(Number(body.unlockedBoard) || 1));
  const bestScore = Math.max(0, Math.floor(Number(body.bestScore) || 0));
  const bestStars = Math.min(3, Math.max(0, Math.floor(Number(body.bestStars) || 0)));
  const tutorialSeen = Boolean(body.tutorialSeen);
  const incomingStars = body.boardStars || {};
  const playerId = body.playerId ? validatePlayerId(body.playerId) : null;
  const token = rawToken ? validatePlayerToken(rawToken) : "";

  const sql = getSql();
  const existingRows = await sql`
    SELECT *
    FROM players
    WHERE username_key = ${key}
    LIMIT 1
  `;
  const existing = existingRows[0] || null;

  if (existing?.auth_token_hash) {
    if (!token || !playerId || existing.id !== playerId) {
      throw new ValidationError("Player credentials are invalid.", undefined, 401);
    }
    if (!playerTokenMatches(existing.auth_token_hash, token)) {
      throw new ValidationError("Player credentials are invalid.", undefined, 401);
    }
  }

  if (!existing) {
    const tokenHash = token ? hashPlayerToken(token) : null;
    const rows = playerId
      ? await sql`
          INSERT INTO players (
            id,
            username_key,
            display_name,
            auth_token_hash,
            unlocked_board,
            best_score,
            best_stars,
            board_stars,
            tutorial_seen
          )
          VALUES (
            ${playerId}::uuid,
            ${key},
            ${displayName},
            ${tokenHash},
            ${unlockedBoard},
            ${bestScore},
            ${bestStars},
            ${mergeBoardStars({}, incomingStars)},
            ${tutorialSeen}
          )
          RETURNING *
        `
      : await sql`
          INSERT INTO players (
            username_key,
            display_name,
            auth_token_hash,
            unlocked_board,
            best_score,
            best_stars,
            board_stars,
            tutorial_seen
          )
          VALUES (
            ${key},
            ${displayName},
            ${tokenHash},
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
      best_stars = ${Math.min(3, Math.max(Number(existing.best_stars) || 0, bestStars))},
      board_stars = ${mergedStars},
      tutorial_seen = ${Boolean(existing.tutorial_seen) || tutorialSeen},
      updated_at = now()
    WHERE username_key = ${key}
    RETURNING *
  `;
  return rowToPlayer(rows[0]);
}

export async function getLeaderboard(limit = 10, currentPlayerId = "") {
  const safeLimit = validateLeaderboardLimit(limit);
  const sql = getSql();
  const rows = await sql`
    SELECT id, username_key, display_name, unlocked_board, best_score, best_stars, updated_at
    FROM players
    WHERE best_score > 0
    ORDER BY best_score DESC, updated_at ASC, username_key ASC
    LIMIT ${safeLimit}
  `;
  return rows.map((row, index) => mapLeaderboardEntry(row, index + 1, currentPlayerId));
}

export async function getPlayerRank(playerId) {
  const id = validatePlayerId(playerId);
  const sql = getSql();
  const rows = await sql`
    WITH ranked_players AS (
      SELECT
        id,
        username_key,
        display_name,
        unlocked_board,
        best_score,
        best_stars,
        updated_at,
        row_number() OVER (
          ORDER BY best_score DESC, updated_at ASC, username_key ASC
        ) AS rank
      FROM players
      WHERE best_score > 0
    )
    SELECT id, username_key, display_name, unlocked_board, best_score, best_stars, updated_at, rank
    FROM ranked_players
    WHERE id = ${id}::uuid
    LIMIT 1
  `;
  if (!rows[0]) return null;
  return mapLeaderboardEntry(rows[0], Number(rows[0].rank) || 0, id);
}

export async function getLeaderboardResponse(limit = 10, currentPlayerId = "") {
  const safeLimit = validateLeaderboardLimit(limit);
  const playerId = currentPlayerId ? validatePlayerId(currentPlayerId) : "";
  const entries = await getLeaderboard(safeLimit, playerId);
  let playerEntry = null;
  if (playerId && !entries.some((entry) => entry.isCurrentPlayer)) {
    playerEntry = await getPlayerRank(playerId);
  }
  return {
    entries,
    playerEntry,
    limit: safeLimit,
    fetchedAt: new Date().toISOString(),
  };
}

export async function deletePlayerByUsername(username, rawToken = "", playerId = "") {
  const key = normalizeUsername(username);
  if (!key) {
    const error = new Error("Username is required");
    error.status = 400;
    throw error;
  }
  const sql = getSql();
  const existingRows = await sql`
    SELECT *
    FROM players
    WHERE username_key = ${key}
    LIMIT 1
  `;
  const existing = existingRows[0] || null;
  if (!existing) return false;

  if (existing.auth_token_hash) {
    const token = validatePlayerToken(rawToken);
    const id = validatePlayerId(playerId);
    if (existing.id !== id || !playerTokenMatches(existing.auth_token_hash, token)) {
      throw new ValidationError("Player credentials are invalid.", undefined, 401);
    }
  }

  const rows = await sql`
    DELETE FROM players
    WHERE username_key = ${key}
    RETURNING username_key
  `;
  return Boolean(rows[0]);
}

export async function pingDb() {
  const sql = getSql();
  const rows = await sql`SELECT 1 AS ok`;
  return Number(rows[0]?.ok) === 1;
}

export { ValidationError };
