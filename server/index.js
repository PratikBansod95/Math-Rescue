import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { applyCors, json, normalizeUsername, publicError, readJsonBody } from "./db.js";
import {
  getLeaderboardResponse,
  getPlayerByUsername,
  pingDb,
  registerPlayer,
  upsertPlayer,
  deletePlayerByUsername,
  ValidationError,
} from "./players.js";
import { getBearerToken } from "./playerAuth.js";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const publicDir = path.join(root, "public");
const PORT = Number(process.env.PORT) || 5173;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
};

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME[ext] || "application/octet-stream");
  fs.createReadStream(filePath).pipe(res);
}

function resolvePublic(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const relative = clean === "/" ? "/index.html" : clean;
  const filePath = path.normalize(path.join(publicDir, relative));
  if (!filePath.startsWith(publicDir)) return null;
  return filePath;
}

async function handleApi(req, res, url) {
  applyCors(res, "GET,POST,PUT,DELETE,OPTIONS");
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (url.pathname === "/api/health") {
    try {
      const ok = await pingDb();
      json(res, 200, { ok: Boolean(ok), service: "math-rescue-api" });
    } catch (error) {
      const { status, message } = publicError(error, "Database unavailable");
      json(res, status, { ok: false, error: message });
    }
    return;
  }

  if (url.pathname === "/api/leaderboard") {
    try {
      const payload = await getLeaderboardResponse(
        url.searchParams.get("limit") || 10,
        url.searchParams.get("playerId") || "",
      );
      json(res, 200, payload);
    } catch (error) {
      if (error instanceof ValidationError) {
        json(res, error.statusCode, { error: error.message, field: error.field });
        return;
      }
      const { status, message } = publicError(error, "Failed to load leaderboard");
      json(res, status, { error: message });
    }
    return;
  }

  if (url.pathname === "/api/players/register" && req.method === "POST") {
    try {
      const body = await readJsonBody(req);
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
    return;
  }

  const playerMatch = url.pathname.match(/^\/api\/players\/([^/]+)$/);
  if (playerMatch) {
    const key = normalizeUsername(decodeURIComponent(playerMatch[1]));
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
        const body = await readJsonBody(req);
        const player = await upsertPlayer(key, body, getBearerToken(req));
        json(res, 200, { player });
        return;
      }
      if (req.method === "DELETE") {
        const body = await readJsonBody(req);
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
      const { status, message } = publicError(error, "Player request failed");
      json(res, status, { error: message });
    }
    return;
  }

  json(res, 404, { error: "Not found" });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (url.pathname.startsWith("/api/")) {
      await handleApi(req, res, url);
      return;
    }

    const filePath = resolvePublic(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      const indexPath = path.join(publicDir, "index.html");
      if (fs.existsSync(indexPath)) {
        sendFile(res, indexPath);
        return;
      }
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    sendFile(res, filePath);
  } catch (error) {
    const { status, message } = publicError(error, "Server error");
    json(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Math Rescue running at http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL is not set. API routes will fail until .env is configured.");
  }
});
