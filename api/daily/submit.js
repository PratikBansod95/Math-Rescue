import { applyCors, json, publicError, readJsonBody } from "../../server/db.js";
import { submitDailyResult } from "../../server/daily.js";
import { getBearerToken } from "../../server/playerAuth.js";
import { ValidationError } from "../../server/validation.js";

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
    const body = await readJsonBody(req);
    const payload = await submitDailyResult(body, getBearerToken(req));
    json(res, 200, payload);
  } catch (error) {
    if (error instanceof ValidationError) {
      json(res, error.statusCode, { error: error.message, field: error.field });
      return;
    }
    const { status, message } = publicError(error, "Failed to submit daily result");
    json(res, status, { error: message });
  }
}
