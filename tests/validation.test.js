import test from "node:test";
import assert from "node:assert/strict";
import {
  validateNickname,
  normalizeNicknameKey,
  MIN_NICKNAME_LENGTH,
  MAX_NICKNAME_LENGTH,
} from "../server/validation.js";

test("validateNickname accepts 3-8 character names", () => {
  assert.equal(validateNickname("Cat"), "Cat");
  assert.equal(validateNickname("MathHero"), "MathHero");
});

test("validateNickname rejects short, long, and invalid names", () => {
  assert.throws(() => validateNickname("ab"), /3-8/);
  assert.throws(() => validateNickname("waytoolong"), /3-8/);
  assert.throws(() => validateNickname("bad!name"), /letters/);
  assert.throws(() => validateNickname("admin"), /reserved/i);
});

test("normalizeNicknameKey is lowercase trimmed", () => {
  assert.equal(normalizeNicknameKey("  Math Cat "), "math cat");
});

test("nickname length constants match Hopiko-style rules", () => {
  assert.equal(MIN_NICKNAME_LENGTH, 3);
  assert.equal(MAX_NICKNAME_LENGTH, 8);
});
