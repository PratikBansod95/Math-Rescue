import { applyCors, json, publicError, readJsonBody } from "../../server/db.js";
import { getBearerToken } from "../../server/playerAuth.js";
import { registerPlayer, ValidationError } from "../../server/players.js";

export default async function handler(req, res) {
  applyCors(res, "POST,OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== "POST") {
    json(res, 405, { error: "Method not allowed" });
    return;
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : await readJsonBody(req);
    const player = await registerPlayer(body, getBearerToken(req));
    json(res, 200, { player });
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, error.statusCode, { error: error.message, field: error.field });
      return;
    }
    const { status, message } = publicError(error, "Could not register player");
    json(res, status, { error: message });
  }
}
