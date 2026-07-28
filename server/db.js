import { neon } from "@neondatabase/serverless";

let sql;

export function getSql() {
  if (sql) return sql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }
  sql = neon(url);
  return sql;
}

export function normalizeUsername(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .slice(0, 24);
}

export function clampDisplayName(name, fallback = "Player") {
  const trimmed = String(name || "").trim().replace(/\s+/g, " ").slice(0, 24);
  return trimmed || fallback;
}

export function mergeBoardStars(existing = {}, incoming = {}) {
  const result = { ...(existing && typeof existing === "object" ? existing : {}) };
  if (!incoming || typeof incoming !== "object") return result;
  for (const [key, value] of Object.entries(incoming)) {
    const board = Number(key);
    const stars = Number(value);
    if (!Number.isFinite(board) || board < 1) continue;
    if (!Number.isFinite(stars) || stars < 1) continue;
    const next = Math.max(1, Math.min(3, Math.floor(stars)));
    const prev = Number(result[String(Math.floor(board))]) || 0;
    result[String(Math.floor(board))] = Math.max(prev, next);
  }
  return result;
}

export function rowToPlayer(row) {
  if (!row) return null;
  return {
    usernameKey: row.username_key,
    name: row.display_name,
    unlockedBoard: Number(row.unlocked_board) || 1,
    bestScore: Number(row.best_score) || 0,
    bestStars: Number(row.best_stars) || 0,
    boardStars: row.board_stars && typeof row.board_stars === "object" ? row.board_stars : {},
    tutorialSeen: Boolean(row.tutorial_seen),
    updatedAt: row.updated_at || null,
  };
}

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(body));
}

export function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
