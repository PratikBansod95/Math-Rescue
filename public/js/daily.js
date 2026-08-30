/** Daily Challenge — date keys, one attempt per UTC day, +5 career bonus on success. */

export const DAILY_CAREER_BONUS = 5;

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
    todayResult: null,
  };
}

export function normalizeDaily(value) {
  const base = emptyDailyState();
  if (!value || typeof value !== "object" || Array.isArray(value)) return base;
  const todayResult = value.todayResult;
  return {
    attemptedDate: typeof value.attemptedDate === "string" ? value.attemptedDate : "",
    todayResult:
      todayResult && typeof todayResult === "object" && !Array.isArray(todayResult)
        ? {
            dateKey: String(todayResult.dateKey || ""),
            stars: Math.max(1, Math.min(3, Number(todayResult.stars) || 1)),
            timeSeconds: Math.max(0, Number(todayResult.timeSeconds) || 0),
            careerBonus: Math.max(0, Number(todayResult.careerBonus) || 0),
            succeeded: Boolean(
              todayResult.succeeded ?? (Number(todayResult.careerBonus) || 0) > 0,
            ),
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
  const current = normalizeDaily(daily);
  if (current.attemptedDate === dateKey) return current;
  return { ...current, attemptedDate: dateKey };
}

export function calcDailyCareerBonus(succeeded = false) {
  return succeeded ? DAILY_CAREER_BONUS : 0;
}

export function buildDailyShareText({
  dateKey = utcDateKey(),
  stars = 1,
  timeSeconds = 0,
  succeeded = false,
  careerBonus = 0,
} = {}) {
  const puzzle = dailyPuzzleNumber(dateKey);
  const starText = "★".repeat(Math.max(1, Math.min(3, stars)));
  const bonusText = succeeded ? `+${careerBonus || DAILY_CAREER_BONUS} career pts` : "no bonus";
  return `Daily Challenge #${puzzle} · ${starText} · ${timeSeconds}s · ${bonusText}`;
}
