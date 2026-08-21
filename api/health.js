import { applyCors, json, publicError } from "../server/db.js";
import { pingDb } from "../server/players.js";

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
    const ok = await pingDb();
    json(res, 200, { ok: Boolean(ok), service: "math-rescue-api" });
  } catch (error) {
    const { status, message } = publicError(error, "Database unavailable");
    json(res, status, { ok: false, error: message });
  }
}
