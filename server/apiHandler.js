import { applyCors, json, publicError } from "./db.js";
import { captureException } from "./monitoring.js";
import { enforceRateLimit, getClientIp } from "./rateLimit.js";
import { ValidationError } from "./validation.js";

export function createApiHandler({
  methods = ["GET"],
  rateLimit = null,
  handler,
}) {
  const allowed = methods.map((method) => method.toUpperCase());

  return async function apiHandler(req, res) {
    applyCors(res, `${allowed.join(",")},OPTIONS`);
    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (!allowed.includes(req.method)) {
      json(res, 405, { error: "Method not allowed" });
      return;
    }

    try {
      if (rateLimit) {
        await enforceRateLimit(
          getClientIp(req),
          rateLimit.bucket,
          rateLimit.max,
          rateLimit.windowSec,
        );
      }
      await handler(req, res);
    } catch (error) {
      captureException(error, {
        route: rateLimit?.bucket || "api",
        method: req.method,
        url: req.url,
      });
      if (error instanceof ValidationError) {
        json(res, error.statusCode, { error: error.message, field: error.field });
        return;
      }
      if (Number(error?.status) === 429) {
        json(res, 429, { error: "Too many requests" });
        return;
      }
      const { status, message } = publicError(error, "Request failed");
      json(res, status, { error: message });
    }
  };
}
