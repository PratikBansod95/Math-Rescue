import { applyCors, json, normalizeUsername, publicError, readJsonBody } from "../../server/db.js";
import { getBearerToken } from "../../server/playerAuth.js";
import {
  deletePlayerByUsername,
  getPlayerByUsername,
  upsertPlayer,
  ValidationError,
} from "../../server/players.js";

export default async function handler(req, res) {
  applyCors(res, "GET,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  const username = req.query?.username || "";
  const key = normalizeUsername(username);
  if (!key) {
    json(res, 400, { error: "Username is required" });
    return;
  }

  try {
    if (req.method === "GET") {
      const player = await getPlayerByUsername(key);
      if (!player) {
        json(res, 404, { error: "Player not found" });
        return;
      }
      json(res, 200, { player });
      return;
    }

    if (req.method === "PUT") {
      const body = typeof req.body === "object" && req.body ? req.body : await readJsonBody(req);
      const player = await upsertPlayer(key, body, getBearerToken(req));
      json(res, 200, { player });
      return;
    }

    if (req.method === "DELETE") {
      const body = typeof req.body === "object" && req.body ? req.body : await readJsonBody(req);
      const deleted = await deletePlayerByUsername(key, getBearerToken(req), body?.playerId || "");
      if (!deleted) {
        json(res, 404, { error: "Player not found" });
        return;
      }
      json(res, 200, { ok: true, deleted: true });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, error.statusCode, { error: error.message, field: error.field });
      return;
    }
    const { status, message } = publicError(error, "Player request failed");
    json(res, status, { error: message });
  }
}
