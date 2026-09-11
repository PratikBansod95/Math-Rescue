import { getSql } from "./db.js";

export function getClientIp(req) {
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["X-Forwarded-For"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  const realIp = req.headers?.["x-real-ip"] || req.headers?.["X-Real-Ip"];
  if (realIp) return String(realIp).trim();
  return req.socket?.remoteAddress || "unknown";
}

export async function enforceRateLimit(ip, bucket, maxRequests, windowSec) {
  const sql = getSql();
  const safeIp = String(ip || "unknown").slice(0, 64);
  const rateKey = `${bucket}:${safeIp}`;
  const rows = await sql`
    INSERT INTO rate_limits (rate_key, hits, window_start)
    VALUES (${rateKey}, 1, now())
    ON CONFLICT (rate_key) DO UPDATE SET
      hits = CASE
        WHEN rate_limits.window_start < now() - (${windowSec} * interval '1 second') THEN 1
        ELSE rate_limits.hits + 1
      END,
      window_start = CASE
        WHEN rate_limits.window_start < now() - (${windowSec} * interval '1 second') THEN now()
        ELSE rate_limits.window_start
      END
    RETURNING hits
  `;
  const hits = Number(rows[0]?.hits) || 0;
  if (hits > maxRequests) {
    const error = new Error("Too many requests");
    error.status = 429;
    throw error;
  }
}

export async function pruneRateLimits(maxAgeSec = 86400) {
  const sql = getSql();
  await sql`
    DELETE FROM rate_limits
    WHERE window_start < now() - (${maxAgeSec} * interval '1 second')
  `;
}
