export const MIN_NICKNAME_LENGTH = 3;
export const MAX_NICKNAME_LENGTH = 8;
export const LEADERBOARD_DEFAULT_LIMIT = 25;
export const LEADERBOARD_MAX_LIMIT = 100;

const RESERVED_WORDS = new Set([
  "admin",
  "administrator",
  "anonymous",
  "cursor",
  "guest",
  "mathrescue",
  "null",
  "owner",
  "system",
  "undefined",
]);

export class ValidationError extends Error {
  constructor(message, field, statusCode = 400) {
    super(message);
    this.name = "ValidationError";
    this.field = field;
    this.statusCode = statusCode;
  }
}

export function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeNicknameKey(value) {
  return normalizeNickname(value).toLowerCase();
}

export function validateNickname(raw) {
  const nickname = normalizeNickname(raw);
  if (nickname.length < MIN_NICKNAME_LENGTH || nickname.length > MAX_NICKNAME_LENGTH) {
    throw new ValidationError(
      `Nickname must be ${MIN_NICKNAME_LENGTH}-${MAX_NICKNAME_LENGTH} characters long.`,
      "nickname",
    );
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(nickname)) {
    throw new ValidationError(
      "Nickname may only contain letters, numbers, spaces, underscores, and hyphens.",
      "nickname",
    );
  }
  if (RESERVED_WORDS.has(normalizeNicknameKey(nickname))) {
    throw new ValidationError("That nickname is reserved. Please choose another.", "nickname");
  }
  return nickname;
}

export function validatePlayerId(raw) {
  const playerId = String(raw || "").trim();
  if (!/^[a-f0-9-]{16,}$/i.test(playerId)) {
    throw new ValidationError("playerId is invalid.", "playerId");
  }
  return playerId;
}

export function validatePlayerToken(raw) {
  const token = String(raw || "").trim().toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(token)) {
    throw new ValidationError("Player credentials are invalid.", undefined, 401);
  }
  return token;
}

export function validateRegisterBody(raw) {
  if (!raw || typeof raw !== "object") {
    throw new ValidationError("Request body must be an object.");
  }
  return {
    playerId: validatePlayerId(raw.playerId),
    nickname: validateNickname(raw.nickname),
    localBestScore: parseOptionalInt(raw.localBestScore, "localBestScore"),
    localUnlockedBoard: parseOptionalInt(raw.localUnlockedBoard, "localUnlockedBoard"),
    localBestStars: parseOptionalInt(raw.localBestStars, "localBestStars"),
    localBoardStars:
      raw.localBoardStars && typeof raw.localBoardStars === "object" ? raw.localBoardStars : {},
    localTutorialSeen: Boolean(raw.localTutorialSeen),
  };
}

export function validateLeaderboardLimit(raw) {
  if (raw === undefined || raw === null || raw === "") return LEADERBOARD_DEFAULT_LIMIT;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ValidationError("limit must be a positive number.", "limit");
  }
  return Math.min(LEADERBOARD_MAX_LIMIT, Math.floor(parsed));
}

function parseOptionalInt(value, field) {
  if (value === undefined || value === null || value === "") return 0;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ValidationError(`${field} must be a non-negative number.`, field);
  }
  return Math.floor(parsed);
}
