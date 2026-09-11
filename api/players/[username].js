import { json, normalizeUsername, readJsonBody } from "../../server/db.js";
import { createApiHandler } from "../../server/apiHandler.js";
import { getBearerToken } from "../../server/playerAuth.js";
import {
  deletePlayerByUsername,
  getPlayerByUsername,
  upsertPlayer,
} from "../../server/players.js";

export default createApiHandler({
  methods: ["GET", "PUT", "DELETE"],
  rateLimit: { bucket: "player", max: 180, windowSec: 3600 },
  handler: async (req, res) => {
    const username = req.query?.username || "";
    const key = normalizeUsername(username);
    if (!key) {
      json(res, 400, { error: "Username is required" });
      return;
    }

    if (req.method === "GET") {
      const player = await getPlayerByUsername(key);
      if (!player) {
        json(res, 404, { error: "Player not found" });
        return;
      }
      json(res, 200, { player });
      return;
    }

    const body = typeof req.body === "object" && req.body ? req.body : await readJsonBody(req);

    if (req.method === "PUT") {
      const player = await upsertPlayer(key, body, getBearerToken(req));
      json(res, 200, { player });
      return;
    }

    const deleted = await deletePlayerByUsername(key, getBearerToken(req), body?.playerId || "");
    if (!deleted) {
      json(res, 404, { error: "Player not found" });
      return;
    }
    json(res, 200, { ok: true, deleted: true });
  },
});
