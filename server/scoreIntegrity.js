/** Server-side progress bounds and score/coin anti-cheat. */

export const DAILY_CAREER_BONUS = 5;
export const MAX_SCORE_PER_LEVEL = 150;
export const MAX_COIN_GRANT_PER_LEVEL = 8;
export const MAX_COIN_SPEND_PER_SYNC = 30;

export function normalizeBoardStars(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result = {};
  for (const [key, stars] of Object.entries(value)) {
    const board = Math.floor(Number(key));
    const n = Math.floor(Number(stars));
    if (!Number.isFinite(board) || board < 1) continue;
    if (!Number.isFinite(n) || n < 1) continue;
    result[String(board)] = Math.max(1, Math.min(3, n));
  }
  return result;
}

export function highestClearedLevel(unlockedBoard, boardStars) {
  const unlocked = Math.max(1, Math.floor(Number(unlockedBoard) || 1));
  let highest = 0;
  for (const key of Object.keys(boardStars)) {
    const level = Math.floor(Number(key));
    if (Number.isFinite(level) && level >= 1) {
      highest = Math.max(highest, level);
    }
  }
  return Math.max(highest, unlocked - 1);
}

export function scoreCap(unlockedBoard, dailySuccessCount = 0) {
  const cleared = Math.max(0, Math.floor(Number(unlockedBoard) || 1) - 1);
  const safeDaily = Math.max(0, Math.floor(Number(dailySuccessCount) || 0));
  return cleared * MAX_SCORE_PER_LEVEL + safeDaily * DAILY_CAREER_BONUS;
}

export function mergeBestScore(existingScore, incomingScore, unlockedBoard, dailySuccessCount = 0) {
  const prev = Math.max(0, Math.floor(Number(existingScore) || 0));
  const incoming = Math.max(0, Math.floor(Number(incomingScore) || 0));
  const cap = scoreCap(unlockedBoard, dailySuccessCount);
  const bounded = Math.min(incoming, cap);
  return Math.max(prev, bounded);
}

export function maxCoinsForProgress(unlockedBoard) {
  const cleared = Math.max(0, Math.floor(Number(unlockedBoard) || 1) - 1);
  return cleared * MAX_COIN_GRANT_PER_LEVEL + 30;
}

export function mergeCoins(existingCoins, incomingCoins, unlockedBoard) {
  const prev = Math.max(0, Math.floor(Number(existingCoins) || 0));
  const next = Math.max(0, Math.floor(Number(incomingCoins) || 0));
  const cap = maxCoinsForProgress(unlockedBoard);
  if (next > cap) return prev;
  if (next > prev) return next;
  if (next < prev) {
    const spent = prev - next;
    if (spent <= MAX_COIN_SPEND_PER_SYNC) return next;
    return prev;
  }
  return prev;
}

export function sanitizePlayerProgress({
  existing = {},
  incoming = {},
  dailySuccessCount = 0,
}) {
  const prevUnlocked = Math.max(1, Math.floor(Number(existing.unlocked_board || existing.unlockedBoard) || 1));
  const prevStars = normalizeBoardStars(existing.board_stars || existing.boardStars);
  const incomingStars = normalizeBoardStars(incoming.boardStars);
  const mergedStars = { ...prevStars };
  for (const [key, stars] of Object.entries(incomingStars)) {
    const level = Math.floor(Number(key));
    if (!Number.isFinite(level) || level < 1) continue;
    if (level >= Math.max(prevUnlocked + 2, Math.floor(Number(incoming.unlockedBoard) || prevUnlocked) + 1)) {
      continue;
    }
    mergedStars[key] = Math.max(Number(mergedStars[key]) || 0, stars);
  }

  let unlockedBoard = Math.max(1, Math.floor(Number(incoming.unlockedBoard) || prevUnlocked));
  const highestStarLevel = highestClearedLevel(unlockedBoard, mergedStars);
  unlockedBoard = Math.max(
    prevUnlocked,
    Math.min(unlockedBoard, highestStarLevel + 1, prevUnlocked + 1),
  );

  for (const key of Object.keys(mergedStars)) {
    if (Math.floor(Number(key)) >= unlockedBoard) {
      delete mergedStars[key];
    }
  }

  const bestScore = mergeBestScore(
    existing.best_score ?? existing.bestScore,
    incoming.bestScore,
    unlockedBoard,
    dailySuccessCount,
  );

  const bestStars = Math.min(
    3,
    Math.max(
      Number(existing.best_stars || existing.bestStars) || 0,
      ...Object.values(mergedStars),
      0,
    ),
  );

  const coins = mergeCoins(existing.coins, incoming.coins, unlockedBoard);

  return {
    unlockedBoard,
    boardStars: mergedStars,
    bestScore,
    bestStars,
    coins,
    tutorialSeen: Boolean(existing.tutorial_seen || existing.tutorialSeen || incoming.tutorialSeen),
    dailyMeta:
      incoming.dailyMeta && typeof incoming.dailyMeta === "object" && !Array.isArray(incoming.dailyMeta)
        ? incoming.dailyMeta
        : existing.daily_meta || existing.dailyMeta || {},
  };
}

export function dailyScoreFromResult(stars, timeSeconds, succeeded) {
  if (!succeeded) return 0;
  const safeStars = Math.max(1, Math.min(3, Math.floor(Number(stars) || 1)));
  const safeTime = Math.max(0, Math.min(600, Math.floor(Number(timeSeconds) || 0)));
  return safeStars * 1000 + Math.max(0, 500 - safeTime);
}

export function utcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}
