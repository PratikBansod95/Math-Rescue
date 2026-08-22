import { applyCors, json, publicError } from "../server/db.js";
import { getDailyLeaderboard } from "../server/daily.js";
import { ValidationError } from "../server/validation.js";

export default async function handler(req, res) {
  applyCors(res, "GET,OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "GET") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const url = new URL(req.url, "http://localhost");
    const dateKey = url.searchParams.get("date") || "";
    const limit = url.searchParams.get("limit") || 25;
    const playerId = url.searchParams.get("playerId") || "";
    const payload = await getDailyLeaderboard(dateKey, limit, playerId);
    json(res, 200, payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, error.statusCode, { error: error.message, field: error.field });
      return;
    }
    const { status, message } = publicError(error, "Failed to load daily leaderboard");
    json(res, status, { error: message });
  }
}
