/**
 * Build the Daily Challenge puzzle bank (tough procedural + optional AI assist).
 *
 * Usage:
 *   npm run daily:generate
 *   OPENAI_API_KEY=sk-... npm run daily:generate -- --ai 5
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createRoundFromSpec,
  createToughProceduralRound,
  evaluateSubmission,
} from "../public/js/puzzle.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "../public/js/data/daily-challenges.data.js");
const TARGET_COUNT = 72;
const useAi = process.argv.includes("--ai");
const aiCount = Number(process.argv.find((arg) => arg.startsWith("--ai="))?.split("=")[1] || 8);

function serializeCard(card) {
  if (card.denominator === 1) return card.numerator;
  return { numerator: card.numerator, denominator: card.denominator };
}

function specKey(spec) {
  const cards = spec.cards
    .map((value) =>
      typeof value === "number" ? String(value) : `${value.numerator}/${value.denominator}`,
    )
    .sort()
    .join(",");
  return `${cards}|${spec.target}`;
}

function toSpec(round) {
  return {
    cards: round.cards.map(serializeCard),
    target: round.target,
    solution: round.exampleSolution,
    difficulty: "expert",
  };
}

function addUnique(bank, seen, spec) {
  const key = specKey(spec);
  if (seen.has(key)) return false;
  const round = createRoundFromSpec({
    cards: spec.cards,
    target: spec.target,
    exampleSolution: spec.solution,
  });
  const check = evaluateSubmission(spec.solution, round);
  if (!check.ok) return false;
  seen.add(key);
  bank.push(spec);
  return true;
}

function generateProcedural(seen, bank, goal) {
  for (let seed = 1; bank.length < goal && seed < 5000; seed += 1) {
    const round = createToughProceduralRound(seed);
    addUnique(bank, seen, toSpec(round));
  }
}

async function generateWithAi(seen, bank, goal) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — skipping AI suggestions.");
    return;
  }

  let added = 0;
  for (let attempt = 0; added < goal && attempt < goal * 4; attempt += 1) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.9,
        messages: [
          {
            role: "system",
            content:
              "You create tough 4-card math puzzles like the 24 game. Use + - * / and parentheses. Cards may include fractions like 3/4. Reply ONLY with JSON: {\"cards\":[numbers or {numerator,denominator}],\"target\":number,\"solution\":\"expression using each card once\"}",
          },
          {
            role: "user",
            content:
              "Create one hard puzzle for grades 7-12. Prefer fractions or nested parentheses. Target between 8 and 80.",
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      console.warn("AI request failed:", await response.text());
      break;
    }

    const payload = await response.json();
    const raw = payload?.choices?.[0]?.message?.content || "{}";
    let spec;
    try {
      spec = JSON.parse(raw);
    } catch {
      continue;
    }
    if (!Array.isArray(spec.cards) || spec.cards.length !== 4 || !spec.solution) continue;
    if (addUnique(bank, seen, spec)) {
      added += 1;
      console.log(`AI puzzle ${added}/${goal}`);
    }
  }
}

function writeBank(bank) {
  const body = `/** Auto-generated Daily Challenge bank — run \`npm run daily:generate\` to refresh */\nexport const DAILY_CHALLENGE_BANK = ${JSON.stringify(bank, null, 2)};\n`;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, body, "utf8");
  console.log(`Wrote ${bank.length} puzzles to ${OUT_FILE}`);
}

const bank = [];
const seen = new Set();

generateProcedural(seen, bank, TARGET_COUNT);
if (useAi) {
  await generateWithAi(seen, bank, Math.min(aiCount, TARGET_COUNT - bank.length));
}

if (bank.length < 12) {
  throw new Error(`Only generated ${bank.length} puzzles — expected at least 12.`);
}

writeBank(bank);
