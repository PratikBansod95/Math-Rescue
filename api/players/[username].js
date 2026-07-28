import { json, normalizeUsername, readJsonBody } from "../../server/db.js";
import { getPlayerByUsername, upsertPlayer } from "../../server/players.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
      const player = await upsertPlayer(key, body);
      json(res, 200, { player });
      return;
    }

    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    const status = error.status || 500;
    json(res, status, { error: error.message || "Player request failed" });
  }
}
