import { json } from "../server/db.js";
import { pingDb } from "../server/players.js";

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
    const ok = await pingDb();
    json(res, 200, { ok: Boolean(ok), service: "math-rescue-api" });
  } catch (error) {
    json(res, 500, { ok: false, error: error.message || "Database unavailable" });
  }
}
