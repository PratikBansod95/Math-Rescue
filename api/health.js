import { json } from "../server/db.js";
import { createApiHandler } from "../server/apiHandler.js";
import { pingDb } from "../server/players.js";

export default createApiHandler({
  methods: ["GET"],
  rateLimit: { bucket: "health", max: 120, windowSec: 60 },
  handler: async (_req, res) => {
    const ok = await pingDb();
    json(res, 200, { ok: Boolean(ok), service: "math-rescue-api" });
  },
});
