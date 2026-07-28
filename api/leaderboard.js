import { json } from "../server/db.js";
import { getLeaderboard } from "../server/players.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
    json(res, 500, { error: error.message || "Failed to load leaderboard" });
  }
}
