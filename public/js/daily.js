/** Daily Rescue — UTC day key, one attempt, streaks, share metrics. */

export const DAILY_CAREER_BONUS = 5;
/** Rescue #N counts from this UTC midnight (product launch). */
export const RESCUE_LAUNCH_UTC = Date.UTC(2026, 0, 1);

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function utcDateKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseUtcDateKey(dateKey) {
  const [y, m, d] = String(dateKey || "").split("-").map(Number);
  if (!y || !m || !d) return new Date();
  return new Date(Date.UTC(y, m - 1, d));
}

export function utcDaysBetween(fromKey, toKey) {
  const from = parseUtcDateKey(fromKey).getTime();
  const to = parseUtcDateKey(toKey).getTime();
  return Math.floor((to - from) / MS_PER_DAY);
}

/** Visible counter: Rescue #N (same puzzle index for all players). */
export function rescueNumber(dateKey = utcDateKey()) {
  const day = Math.floor((parseUtcDateKey(dateKey).getTime() - RESCUE_LAUNCH_UTC) / MS_PER_DAY);
  return Math.max(1, day + 1);
}

/** @deprecated use rescueNumber */
export function dailyPuzzleNumber(dateKey = utcDateKey()) {
  return rescueNumber(dateKey);
}

export function msUntilNextDaily(now = new Date()) {
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(0, next - now.getTime());
}

export function formatDailyCountdown(ms = msUntilNextDaily()) {
  return formatRescueCountdown(ms);
}

export function formatRescueCountdown(ms = msUntilNextDaily()) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDurationClock(totalSeconds = 0) {
  const safe = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function emptyDailyState() {
  return {
    attemptedDate: "",
    todayResult: null,
    rescueStreak: 0,
    longestRescueStreak: 0,
    lastSuccessDate: "",
  };
}

export function normalizeDaily(value) {
  const base = emptyDailyState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const todayResult = value.todayResult;
  return {
    attemptedDate: typeof value.attemptedDate === "string" ? value.attemptedDate : "",
    rescueStreak: Math.max(0, Math.floor(Number(value.rescueStreak) || 0)),
    longestRescueStreak: Math.max(0, Math.floor(Number(value.longestRescueStreak) || 0)),
    lastSuccessDate: typeof value.lastSuccessDate === "string" ? value.lastSuccessDate : "",
    todayResult:
      todayResult && typeof todayResult === "object" && !Array.isArray(todayResult)
        ? {
            dateKey: String(todayResult.dateKey || ""),
            stars: Math.max(1, Math.min(3, Number(todayResult.stars) || 1)),
            timeSeconds: Math.max(0, Number(todayResult.timeSeconds) || 0),
            operationCount: Math.max(0, Math.floor(Number(todayResult.operationCount) || 0)),
            escapePercent: Math.max(0, Math.min(100, Math.floor(Number(todayResult.escapePercent) || 0))),
            careerBonus: Math.max(0, Number(todayResult.careerBonus) || 0),
            succeeded: Boolean(
              todayResult.succeeded ?? (Number(todayResult.careerBonus) || 0) > 0,
            ),
            usedHint: Boolean(todayResult.usedHint),
          }
        : null,
  };
}

export function hasCompletedToday(daily, dateKey = utcDateKey()) {
  const normalized = normalizeDaily(daily);
  if (normalized.attemptedDate === dateKey) return true;
  return normalized.todayResult?.dateKey === dateKey;
}

export function markDailyAttempted(daily, dateKey = utcDateKey()) {
  const current = reconcileRescueStreak(normalizeDaily(daily), dateKey);
  if (current.attemptedDate === dateKey) return current;
  return { ...current, attemptedDate: dateKey };
}

/** If the player skipped a UTC day since their last success, streak breaks. */
export function reconcileRescueStreak(daily, dateKey = utcDateKey()) {
  const normalized = normalizeDaily(daily);
  if (!normalized.lastSuccessDate) return normalized;
  const gap = utcDaysBetween(normalized.lastSuccessDate, dateKey);
  if (gap > 1) {
    return { ...normalized, rescueStreak: 0 };
  }
  return normalized;
}

export function recordRescueOutcome(
  daily,
  {
    dateKey = utcDateKey(),
    succeeded = false,
    stars = 1,
    timeSeconds = 0,
    operationCount = 0,
    usedHint = false,
    timerLimit = 75,
    careerBonus = 0,
  } = {},
) {
  let next = reconcileRescueStreak(normalizeDaily(daily), dateKey);
  let { rescueStreak, longestRescueStreak, lastSuccessDate } = next;
  const metrics = computeEscapeMetrics({
    succeeded,
    timeSeconds,
    timerLimit,
    operationCount,
    usedHint,
  });

  if (succeeded) {
    const gap = lastSuccessDate ? utcDaysBetween(lastSuccessDate, dateKey) : null;
    if (!lastSuccessDate || gap === null || gap > 1) {
      rescueStreak = 1;
    } else if (gap === 1) {
      rescueStreak += 1;
    }
    lastSuccessDate = dateKey;
    longestRescueStreak = Math.max(longestRescueStreak, rescueStreak);
  }

  const todayResult = {
    dateKey,
    stars: Math.max(1, Math.min(3, Math.floor(Number(stars) || 1))),
    timeSeconds: Math.max(0, Math.floor(Number(timeSeconds) || 0)),
    operationCount: Math.max(0, Math.floor(Number(operationCount) || 0)),
    escapePercent: metrics.escapePercent,
    careerBonus: Math.max(0, Math.floor(Number(careerBonus) || 0)),
    succeeded: Boolean(succeeded),
    usedHint: Boolean(usedHint),
  };

  return {
    ...next,
    attemptedDate: dateKey,
    todayResult,
    rescueStreak,
    longestRescueStreak,
    lastSuccessDate,
  };
}

export function calcDailyCareerBonus(succeeded = false) {
  return succeeded ? DAILY_CAREER_BONUS : 0;
}

export function computeEscapeMetrics({
  succeeded = false,
  timeSeconds = 0,
  timerLimit = 75,
  operationCount = 0,
  usedHint = false,
} = {}) {
  const limit = Math.max(1, Number(timerLimit) || 75);
  const elapsed = Math.max(0, Number(timeSeconds) || 0);
  const ops = Math.max(0, Math.floor(Number(operationCount) || 0));

  if (!succeeded) {
    return {
      escapePercent: 0,
      trackCells: 7,
      catCell: 1,
      sharkCell: 6,
    };
  }

  let score = 100;
  score -= Math.min(45, (elapsed / limit) * 45);
  score -= Math.min(30, ops * 5);
  if (usedHint) score -= 12;
  const escapePercent = Math.max(8, Math.min(98, Math.round(score)));

  const trackCells = 7;
  const gap = Math.round((escapePercent / 100) * (trackCells - 2));
  return {
    escapePercent,
    trackCells,
    catCell: 0,
    sharkCell: Math.min(trackCells - 1, gap + 1),
  };
}

export function buildChaseTrackBar(metrics = {}) {
  const cells = Math.max(5, Math.floor(Number(metrics.trackCells) || 7));
  const catCell = Math.max(0, Math.min(cells - 1, Number(metrics.catCell) || 0));
  const sharkCell = Math.max(catCell + 1, Math.min(cells - 1, Number(metrics.sharkCell) || cells - 1));
  const parts = [];
  for (let i = 0; i < cells; i += 1) {
    if (i === catCell) parts.push("🐱");
    else if (i === sharkCell) parts.push("🦈");
    else parts.push("▫️");
  }
  return parts.join("");
}

export function buildDailyShareText({
  dateKey = utcDateKey(),
  timeSeconds = 0,
  operationCount = 0,
  escapePercent = 0,
  succeeded = false,
  rescueStreak = 0,
  metrics = null,
} = {}) {
  const rescue = rescueNumber(dateKey);
  const track = buildChaseTrackBar(metrics || computeEscapeMetrics({ succeeded, timeSeconds, operationCount, escapePercent }));
  const clock = formatDurationClock(timeSeconds);
  const ops = Math.max(0, Math.floor(Number(operationCount) || 0));
  const streakLine = rescueStreak > 0 ? `\nRescue streak 🔥 ${rescueStreak}` : "";
  if (!succeeded) {
    return `Rescue #${rescue} 🐱🦈 — caught today | ${clock} | ${ops} ops\n${track}${streakLine}\nmath-rescue-mu.vercel.app`;
  }
  const pct = Math.max(0, Math.min(100, Math.floor(Number(escapePercent) || 0)));
  return `Rescue #${rescue} 🐱💨🦈 — escaped by ${pct}% | ${clock} | ${ops} ops\n${track}${streakLine}\nmath-rescue-mu.vercel.app`;
}

export function mergeDeviceDailyIntoProfile(profileDaily, deviceDaily) {
  const profile = normalizeDaily(profileDaily);
  const device = normalizeDaily(deviceDaily);
  if (!device.attemptedDate && !device.todayResult) return profile;
  if (!profile.attemptedDate && !profile.todayResult) {
    return {
      ...device,
      rescueStreak: Math.max(profile.rescueStreak, device.rescueStreak),
      longestRescueStreak: Math.max(profile.longestRescueStreak, device.longestRescueStreak),
    };
  }
  const profileDay = profile.attemptedDate || profile.todayResult?.dateKey || "";
  const deviceDay = device.attemptedDate || device.todayResult?.dateKey || "";
  if (deviceDay > profileDay) {
    return {
      ...device,
      longestRescueStreak: Math.max(profile.longestRescueStreak, device.longestRescueStreak),
    };
  }
  return {
    ...profile,
    rescueStreak: Math.max(profile.rescueStreak, device.rescueStreak),
    longestRescueStreak: Math.max(profile.longestRescueStreak, device.longestRescueStreak),
    lastSuccessDate: profile.lastSuccessDate || device.lastSuccessDate,
  };
}
