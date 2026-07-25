import {
  DIVISIONS,
  DIFFICULTIES,
  DEFAULT_DIVISION_ID,
  DEFAULT_DIFFICULTY_ID,
  createRound,
  countUsedCards,
  evaluateSubmission,
  findAlternateSolutions,
  getDivision,
  getDifficulty,
  getRank,
  sanitizeExpression,
  needsSpaceBefore,
  stepOption,
  displayExpression,
  formatNumber,
} from "./puzzle.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import { loadState, saveState, emptyProfile, normalizeUsername } from "./storage.js";

const POINTS_CORRECT = 10;
const POINTS_WRONG = 2;
const POINTS_SKIP = 1;

export function createGame({ mount }) {
  let destroyFn = () => {};

  return {
    start() {
      let disposed = false;
      const audio = createAudio();

      const state = {
        phase: "loading",
        boardIndex: 1,
        unlockedBoard: 1,
        taskIndex: 1,
        tasksPerBoard: 30,
        divisions: DIVISIONS,
        difficulties: DIFFICULTIES,
        divisionId: DEFAULT_DIVISION_ID,
        difficultyId: DEFAULT_DIFFICULTY_ID,
        division: getDivision(DEFAULT_DIVISION_ID),
        difficulty: getDifficulty(DEFAULT_DIFFICULTY_ID),
        score: 0,
        bestScore: 0,
        username: "",
        usernameKey: "",
        profiles: {},
        profileMessage: "Type a username to save your progress.",
        round: createRound({
          boardIndex: 1,
          taskIndex: 1,
          divisionId: DEFAULT_DIVISION_ID,
          difficultyId: DEFAULT_DIFFICULTY_ID,
        }),
        expression: "",
        feedback: {
          kind: "neutral",
          text: "Use cards without repeating them to match the target.",
          detail: "",
        },
        correction: null,
        usedCounts: new Map(),
        result: null,
      };

      const ui = createUI({
        mount,
        handlers: {
          onStart,
          onAppend,
          onInput,
          onBackspace,
          onClear,
          onSubmit,
          onSkip,
          onNewGame,
          onDivisionChange,
          onDifficultyChange,
          onUsernameInput,
        },
      });

      render();
      boot();

      destroyFn = () => {
        disposed = true;
        audio.dispose();
        ui.destroy();
        mount.replaceChildren();
      };

      async function boot() {
        await wait(120);
        if (disposed) return;
        const saved = loadState();
        state.profiles = saved.profiles;
        applyUsername(state.usernameKey ? state.username : saved.lastUsername || "");
        state.round = createRound(state);
        state.phase = "ready";
        state.feedback = {
          kind: "neutral",
          text: state.usernameKey ? `Ready, ${state.username}.` : "Type a username to save progress.",
          detail: "",
        };
        state.correction = null;
        render();
      }

      function onStart() {
        if (state.phase !== "ready") return;
        if (!state.usernameKey) {
          state.feedback = {
            kind: "bad",
            text: "Type a username first.",
            detail: "Use a different name for another saved profile.",
          };
          render();
          return;
        }
        state.phase = "playing";
        ui.hideStartOverlay();
        render();
        audio.unlockFromGesture();
        vibrate(12);
        persist();
      }

      function onNewGame() {
        state.phase = "playing";
        state.boardIndex = state.unlockedBoard;
        state.taskIndex = 1;
        state.score = 0;
        state.round = createRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.feedback = {
          kind: "neutral",
          text: "New run. Find the exact target!",
          detail: "",
        };
        state.correction = null;
        render();
      }

      function onInput(value) {
        if (!isPlaying()) return;
        state.expression = sanitizeExpression(value);
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "neutral",
          text: "Use at least two cards, then submit.",
          detail: "",
        };
        state.correction = null;
        render({ keepFocus: true });
      }

      function onAppend(fragment) {
        if (!isPlaying()) return;
        state.expression = (
          needsSpaceBefore(state.expression, fragment)
            ? `${state.expression} ${fragment}`
            : `${state.expression}${fragment}`
        ).trimStart();
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "neutral",
          text: "Nice. Keep shaping the equation.",
          detail: "",
        };
        state.correction = null;
        render({ keepFocus: true });
        audio.playBlip(560, { duration: 0.045, volume: 0.08 });
      }

      function onBackspace() {
        if (!isPlaying()) return;
        state.expression = state.expression.trimEnd().slice(0, -1).trimEnd();
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "neutral",
          text: "Adjust and try again.",
          detail: "",
        };
        state.correction = null;
        render({ keepFocus: true });
      }

      function onClear() {
        if (!isPlaying()) return;
        state.expression = "";
        state.usedCounts = new Map();
        state.feedback = {
          kind: "neutral",
          text: "Fresh equation. You’ve got this.",
          detail: "",
        };
        state.correction = null;
        render({ keepFocus: true });
      }

      function onSubmit() {
        if (!isPlaying()) return;
        const result = evaluateSubmission(state.expression, state.round);

        if (!result.ok) {
          const correction = buildWrongCorrection(state.expression, result, state.round);
          state.phase = "review";
          state.score = Math.max(0, state.score - POINTS_WRONG);
          state.expression = correction.solution;
          state.usedCounts = countUsedCards(state.expression, state.round.cards);
          state.feedback = {
            kind: "bad",
            text: result.reason || "Incorrect. Study the solution.",
            detail: `−${POINTS_WRONG} points · Tap Next when ready`,
          };
          state.correction = correction;
          audio.play("incorrect");
          vibrate(24);
          render();
          return;
        }

        state.phase = "review";
        state.score += POINTS_CORRECT;
        state.correction = buildCorrectCorrection(state.expression, state.round);
        state.feedback = {
          kind: "good",
          text: state.correction.solutions?.length > 1
            ? "Correct! Brilliant solve — here are other paths."
            : "Correct! Brilliant solve!",
          detail: `+${POINTS_CORRECT} points · Tap Next`,
        };
        audio.play("correct");
        audio.playBlip(880, { duration: 0.08, volume: 0.13 });
        vibrate(35);
        render();
      }

      function onSkip() {
        if (state.phase === "review") {
          advanceTask();
          return;
        }
        if (!isPlaying()) return;

        state.score = Math.max(0, state.score - POINTS_SKIP);
        state.phase = "review";
        state.expression = displayExpression(state.round.exampleSolution);
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "skip",
          text: "Skipped. Review the solution, then tap Next.",
          detail: `−${POINTS_SKIP} point`,
        };
        state.correction = {
          title: "One possible solve",
          attempted: "Skipped",
          result: "",
          solution: displayExpression(state.round.exampleSolution),
          target: state.round.targetLabel || state.round.target,
        };
        audio.play("skip");
        vibrate(16);
        render();
      }

      function advanceTask() {
        if (state.taskIndex >= state.tasksPerBoard) {
          finishBoard();
          return;
        }
        state.taskIndex += 1;
        state.round = createRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.phase = "playing";
        state.feedback = {
          kind: "neutral",
          text: "Next puzzle. Spot the path!",
          detail: "",
        };
        state.correction = null;
        render({ focusInput: true });
      }

      function finishBoard() {
        state.phase = "finished";
        state.result = getRank(state.score);
        const finishedBoard = state.boardIndex;
        if (finishedBoard >= state.unlockedBoard) {
          state.unlockedBoard = finishedBoard + 1;
        }
        state.bestScore = Math.max(state.bestScore, state.score);
        state.feedback = {
          kind: "good",
          text: `Board ${finishedBoard} complete!`,
          detail: `Board ${state.unlockedBoard} unlocked`,
        };
        state.correction = null;
        render();
        audio.playBlip(660, { duration: 0.1, volume: 0.12 });
        audio.playBlip(990, { duration: 0.13, volume: 0.12 });
        persist();
      }

      function isPlaying() {
        return state.phase === "playing";
      }

      function render(options = {}) {
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        ui.render(state, options);
      }

      function onDivisionChange(step) {
        if (state.phase === "loading" || state.phase === "review") return;
        state.divisionId = stepOption(DIVISIONS, state.divisionId, step);
        state.division = getDivision(state.divisionId);
        resetRun("Division changed. Fresh card set ready.");
      }

      function onDifficultyChange(step) {
        if (state.phase === "loading" || state.phase === "review") return;
        state.difficultyId = stepOption(DIFFICULTIES, state.difficultyId, step);
        state.difficulty = getDifficulty(state.difficultyId);
        resetRun("Difficulty changed. New challenge ready.");
      }

      function onUsernameInput(value) {
        if (!["loading", "ready"].includes(state.phase)) return;
        applyUsername(value);
        state.round = createRound(state);
        state.feedback = {
          kind: state.usernameKey ? "neutral" : "bad",
          text: state.usernameKey
            ? `Profile loaded: ${state.username}.`
            : "Type a username to save progress.",
          detail: state.profileMessage,
        };
        render();
      }

      function applyUsername(value) {
        const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 24);
        const key = normalizeUsername(trimmed);
        state.username = trimmed;
        state.usernameKey = key;

        if (!key) {
          const fresh = emptyProfile();
          state.bestScore = fresh.bestScore;
          state.unlockedBoard = fresh.unlockedBoard;
          state.boardIndex = fresh.unlockedBoard;
          state.profileMessage = "Type a username to save your progress.";
          return;
        }

        const profile = state.profiles[key] || { name: trimmed, ...emptyProfile() };
        state.bestScore = profile.bestScore;
        state.unlockedBoard = profile.unlockedBoard;
        state.boardIndex = profile.unlockedBoard;
        state.profileMessage = state.profiles[key]
          ? `Loaded ${profile.name || trimmed}: Board ${profile.unlockedBoard} unlocked.`
          : `New profile: ${trimmed}.`;
      }

      function persist() {
        if (!state.usernameKey) return;
        state.profiles[state.usernameKey] = {
          name: state.username,
          bestScore: state.bestScore,
          unlockedBoard: state.unlockedBoard,
        };
        saveState({
          profiles: state.profiles,
          lastUsername: state.username,
        });
      }

      function resetRun(message) {
        state.phase = state.phase === "ready" ? "ready" : "playing";
        state.taskIndex = 1;
        state.score = 0;
        state.round = createRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.feedback = {
          kind: "neutral",
          text: message,
          detail: state.division.gradeLabel,
        };
        state.correction = null;
        render({ focusInput: state.phase === "playing" });
      }

      function vibrate(ms) {
        try {
          if (navigator.vibrate) navigator.vibrate(ms);
        } catch {
          // Ignore unsupported environments.
        }
      }
    },

    destroy() {
      destroyFn();
      destroyFn = () => {};
    },
  };
}

function buildWrongCorrection(expression, result, round) {
  const attempted = expression.trim() || "Blank answer";
  const detail = Number.isFinite(result.value)
    ? `Your result was ${formatNumber(result.value)}, target was ${round.target}.`
    : "Your equation could not be evaluated yet.";

  return {
    title: "Correction",
    attempted: displayExpression(attempted),
    result: detail,
    solution: displayExpression(round.exampleSolution),
    target: round.targetLabel || round.target,
  };
}

function buildCorrectCorrection(expression, round) {
  const solutions = findAlternateSolutions(round, expression, 3).map(displayExpression);
  if (solutions.length === 0) {
    const example = displayExpression(round.exampleSolution);
    const attempt = displayExpression(expression.trim());
    solutions.push(example === attempt ? attempt : example);
  }

  return {
    title: solutions.length > 1 ? "Other correct answers" : "Correct answer",
    attempted: displayExpression(expression.trim()),
    result: "Your answer is correct. Some cards can have more than one solution.",
    solutions,
    target: round.targetLabel || round.target,
  };
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
