import { applyCors, json, publicError } from "../server/db.js";
import { getLeaderboard } from "../server/players.js";

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
    const players = await getLeaderboard(limit);
    json(res, 200, { players });
  } catch (error) {
    const { status, message } = publicError(error, "Failed to load leaderboard");
    json(res, status, { error: message });
  }
}
