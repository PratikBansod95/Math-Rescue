import { applyCors, json, publicError } from "../server/db.js";
import { getLeaderboardResponse } from "../server/players.js";
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
    const limit = url.searchParams.get("limit") || 10;
    const playerId = url.searchParams.get("playerId") || "";
    const payload = await getLeaderboardResponse(limit, playerId);
    json(res, 200, payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, error.statusCode, { error: error.message, field: error.field });
      return;
    }
    const { status, message } = publicError(error, "Failed to load leaderboard");
    json(res, status, { error: message });
  }
}
