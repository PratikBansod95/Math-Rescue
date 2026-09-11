import { json, readJsonBody } from "../../server/db.js";
import { createApiHandler } from "../../server/apiHandler.js";
import { submitDailyResult } from "../../server/daily.js";
import { getBearerToken } from "../../server/playerAuth.js";

export default createApiHandler({
  methods: ["POST"],
  rateLimit: { bucket: "daily-submit", max: 10, windowSec: 86400 },
  handler: async (req, res) => {
    const body = await readJsonBody(req);
    const payload = await submitDailyResult(body, getBearerToken(req));
    json(res, 200, payload);
  },
});
