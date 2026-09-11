import { json } from "../server/db.js";
import { createApiHandler } from "../server/apiHandler.js";
import { getLeaderboardResponse } from "../server/players.js";

export default createApiHandler({
  methods: ["GET"],
  rateLimit: { bucket: "leaderboard", max: 300, windowSec: 3600 },
  handler: async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    const limit = url.searchParams.get("limit") || 10;
    const playerId = url.searchParams.get("playerId") || "";
    const payload = await getLeaderboardResponse(limit, playerId);
    json(res, 200, payload);
  },
});
