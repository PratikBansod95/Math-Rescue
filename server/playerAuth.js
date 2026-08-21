import { createHash, timingSafeEqual } from "node:crypto";

export function hashPlayerToken(token) {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function playerTokenMatches(storedHash, token) {
  if (!storedHash || !token) return false;
  try {
    const actual = Buffer.from(hashPlayerToken(token), "hex");
    const expected = Buffer.from(storedHash, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export function getBearerToken(req) {
  const header = req.headers?.authorization || req.headers?.Authorization || "";
  const match = String(header).match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : "";
}
