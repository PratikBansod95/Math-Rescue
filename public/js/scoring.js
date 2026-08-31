/** Points, per-level stars, and journey rating helpers. */

export const POINTS_CORRECT = 10;
export const POINTS_WRONG = 2;
export const COINS_PER_3_STARS = 8;
export const COINS_PER_2_STARS = 5;
export const HINT_COST = 10;

/** Per-level stars earned on success (1★ only on forced-solution fail). */
export function calcTaskStars({ firstTry, usedNudge, retriesUsed }) {
  if (firstTry && !usedNudge && retriesUsed === 0) return 3;
  return 2;
}

/** Best journey rating achieved on any cleared level. */
export function bestBoardRating(levelStars) {
  let best = 0;
  for (const stars of Object.values(levelStars || {})) {
    const n = Math.floor(Number(stars));
    if (Number.isFinite(n) && n > 0) {
      best = Math.max(best, Math.min(3, n));
    }
  }
  return best;
}

/** Coins earned when clearing a level at a given star rating. */
export function calcLevelCoinReward(stars) {
  const n = Math.floor(Number(stars) || 0);
  if (n >= 3) return COINS_PER_3_STARS;
  if (n >= 2) return COINS_PER_2_STARS;
  return 0;
}

/** In-run HUD segments (0–3) from stars earned this level. */
export function levelStarPace(stars) {
  const n = Math.floor(Number(stars) || 0);
  if (n >= 3) return 3;
  if (n >= 2) return 2;
  return n >= 1 ? 1 : 0;
}
