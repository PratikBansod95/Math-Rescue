/** Puzzle generation, parsing, and evaluation for Math Rescue. */

export const DIVISIONS = [
  {
    id: "upper-primary",
    label: "Upper Primary Division",
    shortLabel: "Upper Primary",
    gradeLabel: "Grade 4 to 6",
    allowFractions: false,
    integerBaseMax: 8,
    denominatorMax: 1,
  },
  {
    id: "lower-secondary",
    label: "Lower Secondary Division",
    shortLabel: "Lower Secondary",
    gradeLabel: "Grade 7 to 9",
    allowFractions: true,
    integerBaseMax: 10,
    denominatorMax: 6,
  },
  {
    id: "upper-secondary",
    label: "Upper Secondary Division",
    shortLabel: "Upper Secondary",
    gradeLabel: "Grade 10 to 12",
    allowFractions: true,
    integerBaseMax: 12,
    denominatorMax: 10,
  },
];

export const DIFFICULTIES = [
  { id: "easy", label: "Easy", integerBonus: 0, fractionCards: 0, denominatorBonus: 0 },
  { id: "normal", label: "Normal", integerBonus: 1, fractionCards: 1, denominatorBonus: 0 },
  { id: "medium", label: "Medium", integerBonus: 2, fractionCards: 1, denominatorBonus: 1 },
  { id: "advanced", label: "Advanced", integerBonus: 4, fractionCards: 2, denominatorBonus: 2 },
  { id: "olympic", label: "Olympic", integerBonus: 6, fractionCards: 2, denominatorBonus: 4 },
  { id: "legendary", label: "Legendary", integerBonus: 8, fractionCards: 2, denominatorBonus: 6 },
];

export const DEFAULT_DIVISION_ID = DIVISIONS[0].id;
export const DEFAULT_DIFFICULTY_ID = DIFFICULTIES[0].id;

const EPSILON = 1e-9;
const MIN_INTEGER = 1;

const OPERATORS = [
  { symbol: "+", apply: (a, b) => a + b },
  { symbol: "-", apply: (a, b) => a - b },
  { symbol: "*", apply: (a, b) => a * b },
  { symbol: "/", apply: (a, b) => (Math.abs(b) < EPSILON ? null : a / b) },
];

export const RANKS = [
  { minScore: 270, title: "Grand Mastermind", message: "Elite accuracy. You made the numbers dance." },
  { minScore: 210, title: "Number Wizard", message: "Sharp mental math with strong target instincts." },
  { minScore: 150, title: "Equation Expert", message: "Solid solving. Parentheses are becoming your power tool." },
  { minScore: 90, title: "Puzzle Apprentice", message: "Good practice run. Keep testing multiplication paths first." },
  { minScore: 0, title: "Practice Explorer", message: "Every attempt trains your math eye. Try another board." },
];

export function getDivision(id) {
  return DIVISIONS.find((d) => d.id === id) || DIVISIONS[0];
}

export function getDifficulty(id) {
  return DIFFICULTIES.find((d) => d.id === id) || DIFFICULTIES[0];
}

export function getRank(score) {
  return RANKS.find((r) => score >= r.minScore) || RANKS.at(-1);
}

export function createRound({
  boardIndex = 1,
  taskIndex = 1,
  divisionId = DEFAULT_DIVISION_ID,
  difficultyId = DEFAULT_DIFFICULTY_ID,
} = {}) {
  const division = getDivision(divisionId);
  const difficulty = getDifficulty(difficultyId);
  const special = specialTypeForTask(taskIndex, division);

  if (special === "matching-target-cards") {
    return createMatchingTargetRound(boardIndex, taskIndex, division, difficulty);
  }
  if (special === "all-target-with-fraction") {
    return createAllTargetFractionRound(boardIndex, taskIndex, division, difficulty);
  }

  for (let attempt = 0; attempt < 180; attempt += 1) {
    const cards = generateCards(division, difficulty, boardIndex);
    const solutions = findIntegerTargets(cards, boardIndex, difficulty);
    if (solutions.length > 0) {
      const picked = solutions[randomInt(0, solutions.length - 1)];
      return {
        cards,
        target: picked.value,
        targetLabel: formatTarget(picked.value),
        exampleSolution: picked.expression,
        specialType: null,
      };
    }
  }

  return {
    cards: makeCards([2, 4, 6, 8]),
    target: 24,
    targetLabel: "24",
    exampleSolution: "((2 + 4) * (8 - 6))",
    specialType: null,
  };
}

export function countUsedCards(expression, cards) {
  if (!cards) return new Map();
  const parsed = tokenize(expression, cards);
  return parsed.ok ? countTokens(parsed.tokens).counts : new Map();
}

export function evaluateSubmission(expression, round) {
  const trimmed = expression.trim();
  if (!trimmed) return fail("Enter an equation first.");

  const parsed = tokenize(trimmed, round.cards);
  if (!parsed.ok) return fail(parsed.reason);

  const usage = countTokens(parsed.tokens);
  if (usage.total < 2) return fail("Use at least two cards before submitting.");
  if (usage.total > round.cards.length) return fail("Do not repeat a card twice.");

  const available = cardAvailability(round.cards);
  for (const [key, count] of usage.counts) {
    const max = available.get(key) || 0;
    if (max === 0) return fail("Use only the four visible cards.");
    if (count > max) return fail("Do not repeat a card twice.");
  }

  const result = evaluateTokens(parsed.tokens);
  if (!result.ok) return fail(result.reason);
  if (!Number.isFinite(result.value)) return fail("That equation does not make a usable number.");
  if (Math.abs(result.value - round.target) <= EPSILON) {
    return { ok: true, value: result.value };
  }
  return fail("Incorrect, try again!", result.value);
}

export function findAlternateSolutions(round, attempted = "", limit = 3) {
  const attemptedKey = normalizeExpression(attempted);
  const results = [];
  const seen = new Set();

  for (const expression of [round.exampleSolution, ...enumerateSolutions(round)]) {
    const key = normalizeExpression(expression);
    if (!key || key === attemptedKey || seen.has(key)) continue;
    seen.add(key);
    results.push(expression);
    if (results.length >= limit) break;
  }
  return results;
}

function specialTypeForTask(taskIndex, division) {
  if ([5, 15, 25].includes(taskIndex)) return "matching-target-cards";
  if ([10, 20, 30].includes(taskIndex)) {
    return division.allowFractions ? "all-target-with-fraction" : "matching-target-cards";
  }
  return null;
}

function createMatchingTargetRound(boardIndex, taskIndex, division, difficulty) {
  const target = pickSpecialTarget(boardIndex, difficulty, taskIndex);
  const matchCount = taskIndex === 15 ? 3 : randomInt(2, 3);
  const other = pickOtherCard(target, boardIndex, difficulty);
  const raw =
    matchCount === 3
      ? [target, target, target, other]
      : [target, target, other, other];
  const cards = makeCards(raw);
  const example =
    matchCount === 3
      ? `(${cards[0].input} + ((${cards[1].input} - ${cards[2].input}) * ${cards[3].input}))`
      : `(${cards[0].input} + ((${cards[2].input} - ${cards[3].input}) * ${cards[1].input}))`;
  shuffle(cards);

  return {
    cards,
    target,
    targetLabel: formatTarget(target),
    exampleSolution: example,
    specialType: "matching-target-cards",
    note: division.allowFractions
      ? "Some boards include target-matching cards."
      : "Target-matching cards appear on this board.",
  };
}

function createAllTargetFractionRound(boardIndex, taskIndex, division, difficulty) {
  const target = pickSpecialTarget(boardIndex, difficulty, taskIndex);
  const denom = Math.max(2, Math.min(12, division.denominatorMax + difficulty.denominatorBonus || 2));
  const cards = makeCards([
    target,
    target,
    target,
    { numerator: target * denom, denominator: denom, preserve: true },
  ]);
  const example = `(${cards[3].input} + ((${cards[0].input} - ${cards[1].input}) * ${cards[2].input}))`;
  shuffle(cards);

  return {
    cards,
    target,
    targetLabel: formatTarget(target),
    exampleSolution: example,
    specialType: "all-target-with-fraction",
    note: "Every card equals the target; one is written as a fraction.",
  };
}

function pickSpecialTarget(boardIndex, difficulty, taskIndex) {
  const ceiling = 4 + boardIndex * 2 + difficulty.integerBonus;
  return randomInt(2, Math.max(3, ceiling + (taskIndex % 4) * 2));
}

function pickOtherCard(target, boardIndex, difficulty) {
  let value = randomInt(1, Math.max(target + 2, target + boardIndex + difficulty.integerBonus + 5));
  if (value === target) value += 1;
  return value;
}

function generateCards(division, difficulty, boardIndex) {
  const maxInt = division.integerBaseMax + difficulty.integerBonus + Math.max(0, boardIndex - 1) * 2;
  const fractionCount = division.allowFractions ? Math.min(2, difficulty.fractionCards) : 0;
  const raw = [];

  for (let i = 0; i < fractionCount; i += 1) {
    raw.push(randomFraction(division.denominatorMax + difficulty.denominatorBonus));
  }
  while (raw.length < 4) {
    raw.push({ numerator: randomInt(MIN_INTEGER, maxInt), denominator: 1 });
  }

  shuffle(raw);
  return makeCards(raw);
}

function makeCards(values) {
  return values.map((value, index) => {
    const fraction =
      typeof value === "number"
        ? { numerator: value, denominator: 1 }
        : simplifyFraction(value);
    const label = formatFraction(fraction);
    return {
      id: `card-${index}`,
      key: label,
      label,
      input: fraction.denominator === 1 ? label : `(${label})`,
      value: fraction.numerator / fraction.denominator,
      numerator: fraction.numerator,
      denominator: fraction.denominator,
    };
  });
}

function randomFraction(denominatorMax) {
  const denom = randomInt(2, Math.max(2, denominatorMax));
  return reduceFraction(randomInt(1, denom - 1), denom);
}

function findIntegerTargets(cards, boardIndex, difficulty) {
  const map = new Map();
  const maxAbs = 80 + boardIndex * 30 + difficulty.integerBonus * 10;
  const nodes = cards.map((c) => ({ value: c.value, expression: c.input }));

  for (const result of combineAll(nodes)) {
    const rounded = Math.round(result.value);
    if (Math.abs(result.value - rounded) <= EPSILON && Math.abs(rounded) <= maxAbs) {
      map.set(rounded, { value: rounded, expression: result.expression });
    }
  }
  return Array.from(map.values());
}

function enumerateSolutions(round) {
  const solutions = [];
  const maskLimit = 1 << round.cards.length;

  for (let mask = maskLimit - 1; mask > 0; mask -= 1) {
    const subset = [];
    for (let i = 0; i < round.cards.length; i += 1) {
      if (mask & (1 << i)) subset.push(round.cards[i]);
    }
    if (subset.length < 2) continue;

    const nodes = subset.map((c) => ({ value: c.value, expression: c.input }));
    for (const result of combineAll(nodes)) {
      if (Math.abs(result.value - round.target) <= EPSILON) {
        solutions.push(result.expression);
      }
    }
  }
  return solutions;
}

function combineAll(nodes) {
  if (nodes.length === 1) return nodes;
  const results = [];

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = 0; j < nodes.length; j += 1) {
      if (i === j) continue;
      const rest = nodes.filter((_, index) => index !== i && index !== j);
      const left = nodes[i];
      const right = nodes[j];

      for (const op of OPERATORS) {
        const value = op.apply(left.value, right.value);
        if (value === null || !Number.isFinite(value) || Math.abs(value) > 1e4) continue;
        const expression = `(${left.expression} ${op.symbol} ${right.expression})`;
        results.push(...combineAll([...rest, { value, expression }]));
      }
    }
  }
  return dedupeResults(results);
}

function dedupeResults(results) {
  const seen = new Set();
  const unique = [];
  for (const result of results) {
    const key = `${result.value.toFixed(9)}:${result.expression}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(result);
  }
  return unique;
}

function tokenize(expression, cards) {
  const tokens = [];
  let index = 0;
  const fractionLabels = new Set(cards.filter((c) => c.denominator !== 1).map((c) => c.label));

  while (index < expression.length) {
    const char = expression[index];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9]/.test(char)) {
      const fractionMatch = expression.slice(index).match(/^\d+\/\d+/);
      if (fractionMatch && fractionLabels.has(fractionMatch[0])) {
        const [num, den] = fractionMatch[0].split("/").map(Number);
        tokens.push({ type: "number", value: num / den, key: fractionMatch[0] });
        index += fractionMatch[0].length;
        continue;
      }
      const intMatch = expression.slice(index).match(/^\d+/)[0];
      tokens.push({ type: "number", value: Number(intMatch), key: intMatch });
      index += intMatch.length;
      continue;
    }

    if (char === "(" || char === ")") {
      tokens.push({ type: char });
      index += 1;
      continue;
    }

    const op = char === "×" ? "*" : char === "÷" ? "/" : char;
    if (["+", "-", "*", "/"].includes(op)) {
      tokens.push({ type: "operator", value: op });
      index += 1;
      continue;
    }

    return { ok: false, reason: "Use only card numbers, +, −, ×, ÷, and parentheses." };
  }

  return { ok: true, tokens };
}

function countTokens(tokens) {
  const counts = new Map();
  let total = 0;
  for (const token of tokens) {
    if (token.type === "number") {
      total += 1;
      counts.set(token.key, (counts.get(token.key) || 0) + 1);
    }
  }
  return { counts, total };
}

function evaluateTokens(tokens) {
  let pos = 0;

  function peek() {
    return tokens[pos];
  }

  function consume() {
    const token = tokens[pos];
    pos += 1;
    return token;
  }

  function parseExpression() {
    let left = parseTerm();
    if (!left.ok) return left;

    while (peek()?.type === "operator" && ["+", "-"].includes(peek().value)) {
      const op = consume().value;
      const right = parseTerm();
      if (!right.ok) return right;
      left = {
        ok: true,
        value: op === "+" ? left.value + right.value : left.value - right.value,
      };
    }
    return left;
  }

  function parseTerm() {
    let left = parseFactor();
    if (!left.ok) return left;

    while (peek()?.type === "operator" && ["*", "/"].includes(peek().value)) {
      const op = consume().value;
      const right = parseFactor();
      if (!right.ok) return right;
      if (op === "/" && Math.abs(right.value) < EPSILON) {
        return { ok: false, reason: "Division by zero is not allowed." };
      }
      left = {
        ok: true,
        value: op === "*" ? left.value * right.value : left.value / right.value,
      };
    }
    return left;
  }

  function parseFactor() {
    const token = peek();
    if (!token) return { ok: false, reason: "Finish the equation before submitting." };

    if (token.type === "operator" && ["+", "-"].includes(token.value)) {
      const op = consume().value;
      const factor = parseFactor();
      if (!factor.ok) return factor;
      return { ok: true, value: op === "-" ? -factor.value : factor.value };
    }

    if (token.type === "number") {
      consume();
      return { ok: true, value: token.value };
    }

    if (token.type === "(") {
      consume();
      const inner = parseExpression();
      if (!inner.ok) return inner;
      if (peek()?.type !== ")") return { ok: false, reason: "Close every parenthesis." };
      consume();
      return inner;
    }

    return { ok: false, reason: "Check the order of your cards and operators." };
  }

  const result = parseExpression();
  if (result.ok && pos < tokens.length) {
    return { ok: false, reason: "Check the order of your cards and operators." };
  }
  return result;
}

function cardAvailability(cards) {
  const map = new Map();
  for (const card of cards) {
    map.set(card.key, (map.get(card.key) || 0) + 1);
  }
  return map;
}

function reduceFraction(numerator, denominator) {
  const g = gcd(Math.abs(numerator), Math.abs(denominator));
  return { numerator: numerator / g, denominator: denominator / g };
}

function simplifyFraction(fraction) {
  if (fraction.preserve) {
    return { numerator: fraction.numerator, denominator: fraction.denominator };
  }
  return reduceFraction(fraction.numerator, fraction.denominator);
}

function formatFraction({ numerator, denominator }) {
  return denominator === 1 ? String(numerator) : `${numerator}/${denominator}`;
}

function formatTarget(value) {
  return String(Number.isInteger(value) ? value : Number(value.toFixed(3)));
}

export function normalizeExpression(expression) {
  return expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replace(/\s+/g, "")
    .replace(/^\((.*)\)$/u, "$1");
}

export function displayExpression(expression) {
  return expression.replaceAll(" * ", " × ").replaceAll(" / ", " ÷ ");
}

export function sanitizeExpression(expression) {
  return expression
    .replaceAll("×", "*")
    .replaceAll("÷", "/")
    .replace(/[^0-9+\-*/()\s]/g, "")
    .slice(0, 80);
}

export function needsSpaceBefore(expression, fragment) {
  if (expression.length === 0) return false;
  const last = expression.trimEnd().at(-1);
  const first = fragment.at(0);
  return /\d/.test(last) && /\d/.test(first);
}

export function stepOption(list, currentId, step) {
  const index = Math.max(0, list.findIndex((item) => item.id === currentId));
  return list[(index + step + list.length) % list.length].id;
}

export function formatNumber(value) {
  return String(Number.isInteger(value) ? value : Number(value.toFixed(3)));
}

function gcd(a, b) {
  while (b !== 0) {
    const temp = a % b;
    a = b;
    b = temp;
  }
  return a || 1;
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = randomInt(0, i);
    [array[i], array[j]] = [array[j], array[i]];
  }
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fail(reason, value = null) {
  return { ok: false, reason, value };
}
