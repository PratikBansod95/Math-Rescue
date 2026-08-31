import test from "node:test";
import assert from "node:assert/strict";
import {
  saveState,
  loadState,
  clearAllState,
  emptyProfile,
  normalizeUsername,
} from "../public/js/storage.js";
import { calcLevelCoinReward } from "../public/js/scoring.js";

const store = new Map();

test.beforeEach(() => {
  store.clear();
  globalThis.localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
    removeItem: (key) => {
      store.delete(key);
    },
  };
});

test("normalizeProfiles keeps coins separate per user", () => {
  const alice = normalizeUsername("alice");
  const bob = normalizeUsername("bob");

  saveState({
    profiles: {
      [alice]: { ...emptyProfile(), name: "alice", coins: 16, bestScore: 40 },
      [bob]: { ...emptyProfile(), name: "bob", coins: 5, bestScore: 10 },
    },
    lastUsername: "alice",
    settings: { sound: true },
    resume: null,
  });

  const loaded = loadState();
  assert.equal(loaded.profiles[alice].coins, 16);
  assert.equal(loaded.profiles[bob].coins, 5);
  assert.equal(loaded.profiles[alice].bestScore, 40);
  assert.equal(loaded.profiles[bob].bestScore, 10);
});

test("loadState defaults missing coins to zero", () => {
  const player = normalizeUsername("legacy");
  store.set(
    "math-rescue-v1",
    JSON.stringify({
      version: 1,
      profiles: {
        [player]: {
          name: "legacy",
          bestScore: 20,
          unlockedBoard: 2,
          bestStars: 2,
          tutorialSeen: false,
          taskStars: {},
          boardStars: { 1: 2 },
        },
      },
      lastUsername: "legacy",
      settings: { sound: true },
      resume: null,
    }),
  );

  const loaded = loadState();
  assert.equal(loaded.profiles[player].coins, 0);
});

test("saveState round-trips coin updates after level rewards", () => {
  const player = normalizeUsername("test2");
  const reward = calcLevelCoinReward(3);

  saveState({
    profiles: {
      [player]: { ...emptyProfile(), name: "test2", coins: 0, bestScore: 30 },
    },
    lastUsername: "test2",
    settings: { sound: true },
    resume: null,
  });

  const mid = loadState();
  const profile = mid.profiles[player];
  profile.coins = (profile.coins || 0) + reward;
  profile.bestScore += 10;

  saveState({
    profiles: mid.profiles,
    lastUsername: "test2",
    settings: mid.settings,
    resume: null,
  });

  const after = loadState();
  assert.equal(reward, 8);
  assert.equal(after.profiles[player].coins, 8);
  assert.equal(after.profiles[player].bestScore, 40);
});

test("freeHintUsed persists per user after first free hint", () => {
  const player = normalizeUsername("rookie");
  saveState({
    profiles: {
      [player]: { ...emptyProfile(), name: "rookie", freeHintUsed: false },
    },
    lastUsername: "rookie",
    settings: { sound: true },
    resume: null,
  });

  const loaded = loadState();
  loaded.profiles[player].freeHintUsed = true;
  saveState({
    profiles: loaded.profiles,
    lastUsername: "rookie",
    settings: loaded.settings,
    resume: null,
  });

  const after = loadState();
  assert.equal(after.profiles[player].freeHintUsed, true);
});

test("clearAllState removes saved coin balances", () => {
  const player = normalizeUsername("resetme");
  saveState({
    profiles: {
      [player]: { ...emptyProfile(), name: "resetme", coins: 12 },
    },
    lastUsername: "resetme",
    settings: { sound: true },
    resume: null,
  });

  clearAllState();
  const loaded = loadState();
  assert.deepEqual(loaded.profiles, {});
});
