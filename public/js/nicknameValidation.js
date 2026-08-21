export const MIN_NICKNAME_LENGTH = 3;
export const MAX_NICKNAME_LENGTH = 8;

const RESERVED_WORDS = new Set([
  "admin",
  "administrator",
  "anonymous",
  "cursor",
  "guest",
  "mathrescue",
  "null",
  "owner",
  "system",
  "undefined",
]);

export function normalizeNickname(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeNicknameKey(value) {
  return normalizeNickname(value).toLowerCase();
}

export function validateNickname(raw) {
  const nickname = normalizeNickname(raw);
  if (!nickname) {
    return { ok: false, message: "Enter a rescue name to continue." };
  }
  if (nickname.length < MIN_NICKNAME_LENGTH || nickname.length > MAX_NICKNAME_LENGTH) {
    return {
      ok: false,
      message: `Use ${MIN_NICKNAME_LENGTH}-${MAX_NICKNAME_LENGTH} characters.`,
    };
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(nickname)) {
    return {
      ok: false,
      message: "Letters, numbers, spaces, _ and - only.",
    };
  }
  if (RESERVED_WORDS.has(normalizeNicknameKey(nickname))) {
    return { ok: false, message: "That name is reserved. Try another." };
  }
  return { ok: true, nickname };
}
