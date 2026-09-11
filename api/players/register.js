import { json, readJsonBody } from "../../server/db.js";
import { createApiHandler } from "../../server/apiHandler.js";
import { getBearerToken } from "../../server/playerAuth.js";
import { registerPlayer } from "../../server/players.js";

export default createApiHandler({
  methods: ["POST"],
  rateLimit: { bucket: "register", max: 20, windowSec: 3600 },
  handler: async (req, res) => {
    const body = typeof req.body === "object" && req.body ? req.body : await readJsonBody(req);
    const player = await registerPlayer(body, getBearerToken(req));
    json(res, 200, { player });
  },
});
