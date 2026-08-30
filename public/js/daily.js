/** Daily Rescue — date keys, scoring, streaks, and profile helpers. */

export const DAILY_CAREER_CAP = 15;
export const DAILY_CAREER_COMPLETE = 10;
export const DAILY_CAREER_PERFECT_BONUS = 5;
export const DAILY_STREAK_MILESTONE_BONUS = 25;
export const DAILY_STREAK_SHIELD_AT = 3;
export const DAILY_WEEK_MILESTONE = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const EPOCH = Date.UTC(2024, 0, 1);

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

export function dailyPuzzleNumber(dateKey = utcDateKey()) {
  const day = Math.floor((parseUtcDateKey(dateKey).getTime() - EPOCH) / MS_PER_DAY);
  return Math.max(1, day + 1);
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
  const totalMinutes = Math.ceil(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m`;
  return `${hours}h ${minutes}m`;
}

export function emptyDailyState() {
  return {
    attemptedDate: "",
    lastPlayedDate: "",
    streak: 0,
    bestStreak: 0,
    streakShields: 0,
    weekMilestoneDate: "",
    todayResult: null,
    cosmetics: [],
    titles: [],
  };
}

export function normalizeDaily(value) {
  const base = emptyDailyState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const todayResult = value.todayResult;
  return {
    attemptedDate: typeof value.attemptedDate === "string" ? value.attemptedDate : "",
    lastPlayedDate: typeof value.lastPlayedDate === "string" ? value.lastPlayedDate : "",
    streak: Number.isFinite(Number(value.streak)) ? Math.max(0, Number(value.streak)) : 0,
    bestStreak: Number.isFinite(Number(value.bestStreak)) ? Math.max(0, Number(value.bestStreak)) : 0,
    streakShields: Number.isFinite(Number(value.streakShields))
      ? Math.max(0, Number(value.streakShields))
      : 0,
    weekMilestoneDate: typeof value.weekMilestoneDate === "string" ? value.weekMilestoneDate : "",
    todayResult:
      todayResult && typeof todayResult === "object" && !Array.isArray(todayResult)
        ? {
            dateKey: String(todayResult.dateKey || ""),
            dailyScore: Math.max(0, Number(todayResult.dailyScore) || 0),
            stars: Math.max(1, Math.min(3, Number(todayResult.stars) || 1)),
            timeSeconds: Math.max(0, Number(todayResult.timeSeconds) || 0),
            careerBonus: Math.max(0, Number(todayResult.careerBonus) || 0),
            submitted: Boolean(todayResult.submitted),
          }
        : null,
    cosmetics: Array.isArray(value.cosmetics)
      ? value.cosmetics.filter((item) => typeof item === "string")
      : [],
    titles: Array.isArray(value.titles)
      ? value.titles.filter((item) => typeof item === "string")
      : [],
  };
}

export function hasCompletedToday(daily, dateKey = utcDateKey()) {
  const normalized = normalizeDaily(daily);
  if (normalized.attemptedDate === dateKey) return true;
  if (normalized.lastPlayedDate === dateKey) return true;
  return normalized.todayResult?.dateKey === dateKey;
}

export function markDailyAttempted(daily, dateKey = utcDateKey()) {
  const current = normalizeDaily(daily);
  if (current.attemptedDate === dateKey) return current;
  return { ...current, attemptedDate: dateKey };
}

export function calcDailyScore({ stars = 1, secondsLeft = 0, streak = 0 } = {}) {
  const base = 50;
  const timeBonus = Math.floor(Math.max(0, secondsLeft) * 0.5);
  const starBonus = stars >= 3 ? 20 : stars >= 2 ? 10 : 0;
  const streakBonus = Math.min(Math.max(0, streak) * 2, 14);
  return base + timeBonus + starBonus + streakBonus;
}

export function calcDailyCareerBonus({ stars = 1, weekMilestone = false } = {}) {
  let bonus = DAILY_CAREER_COMPLETE;
  if (stars >= 3) bonus += DAILY_CAREER_PERFECT_BONUS;
  if (weekMilestone) bonus += DAILY_STREAK_MILESTONE_BONUS;
  return Math.min(bonus, DAILY_CAREER_CAP);
}

function previousUtcDateKey(dateKey) {
  const date = parseUtcDateKey(dateKey);
  date.setUTCDate(date.getUTCDate() - 1);
  return utcDateKey(date);
}

export function advanceDailyStreak(daily, dateKey = utcDateKey()) {
  const current = normalizeDaily(daily);
  if (current.lastPlayedDate === dateKey) {
    return { daily: current, streakGain: 0, usedShield: false, weekMilestone: false };
  }

  const yesterday = previousUtcDateKey(dateKey);
  let streak = 1;
  let usedShield = false;
  let streakShields = current.streakShields;

  if (current.lastPlayedDate === yesterday) {
    streak = current.streak + 1;
  } else if (current.lastPlayedDate && streakShields > 0) {
    const gapStart = parseUtcDateKey(current.lastPlayedDate);
    gapStart.setUTCDate(gapStart.getUTCDate() + 1);
    const missedDays = Math.floor(
      (parseUtcDateKey(dateKey).getTime() - gapStart.getTime()) / MS_PER_DAY,
    );
    if (missedDays === 1) {
      streak = current.streak + 1;
      streakShields -= 1;
      usedShield = true;
    }
  }

  const bestStreak = Math.max(current.bestStreak, streak);
  if (streak === DAILY_STREAK_SHIELD_AT && streakShields < 1) {
    streakShields += 1;
  }

  const weekMilestone = streak >= DAILY_WEEK_MILESTONE && current.weekMilestoneDate !== dateKey;
  const weekMilestoneDate = weekMilestone ? dateKey : current.weekMilestoneDate;
  const cosmetics = [...current.cosmetics];
  const titles = [...current.titles];

  if (streak >= 14 && !cosmetics.includes("trail-blue")) {
    cosmetics.push("trail-blue");
  }
  if (streak >= 30 && !titles.includes("daily-lifeguard")) {
    titles.push("daily-lifeguard");
  }

  return {
    daily: {
      ...current,
      lastPlayedDate: dateKey,
      streak,
      bestStreak,
      streakShields,
      weekMilestoneDate,
      cosmetics,
      titles,
    },
    streakGain: streak - (current.lastPlayedDate === yesterday ? current.streak : 0),
    usedShield,
    weekMilestone,
  };
}

export function buildDailyShareText({
  dateKey = utcDateKey(),
  stars = 1,
  timeSeconds = 0,
  streak = 0,
  dailyScore = 0,
} = {}) {
  const puzzle = dailyPuzzleNumber(dateKey);
  const starText = "★".repeat(Math.max(1, Math.min(3, stars)));
  return `Daily Rescue #${puzzle} · ${starText} · ${timeSeconds}s · score ${dailyScore} · streak ${streak}`;
}
