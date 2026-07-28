import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { json, normalizeUsername, readJsonBody } from "./db.js";
import { getLeaderboard, getPlayerByUsername, pingDb, upsertPlayer } from "./players.js";

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
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,PUT,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
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
      json(res, 500, { ok: false, error: error.message || "Database unavailable" });
    }
    return;
  }

  if (url.pathname === "/api/leaderboard") {
    try {
      const players = await getLeaderboard(url.searchParams.get("limit") || 10);
      json(res, 200, { players });
    } catch (error) {
      json(res, 500, { error: error.message || "Failed to load leaderboard" });
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
        const player = await upsertPlayer(key, body);
        json(res, 200, { player });
        return;
      }
      json(res, 405, { error: "Method not allowed" });
    } catch (error) {
      json(res, error.status || 500, { error: error.message || "Player request failed" });
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
    json(res, 500, { error: error.message || "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Math Rescue running at http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn("Warning: DATABASE_URL is not set. API routes will fail until .env is configured.");
  }
});
