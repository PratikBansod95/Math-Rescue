import { json } from "../server/db.js";
import { createApiHandler } from "../server/apiHandler.js";
import { getDailyLeaderboard } from "../server/daily.js";

export default createApiHandler({
  methods: ["GET"],
  rateLimit: { bucket: "daily-leaderboard", max: 300, windowSec: 3600 },
  handler: async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const dateKey = url.searchParams.get("date") || "";
    const limit = url.searchParams.get("limit") || 25;
    const playerId = url.searchParams.get("playerId") || "";
    const payload = await getDailyLeaderboard(dateKey, limit, playerId);
    json(res, 200, payload);
  },
});
