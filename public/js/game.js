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
  needsSpaceBefore,
  displayExpression,
  formatNumber,
} from "./puzzle.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import {
  loadState,
  saveState,
  emptyProfile,
  normalizeUsername,
  defaultSettings,
  DEFAULT_BOARD_LENGTH,
  topProfilesByScore,
} from "./storage.js";

const POINTS_CORRECT = 10;
const POINTS_WRONG = 2;
const MAX_RETRIES = 2;

const TIMER_LIMITS = {
  easy: 45,
  normal: 60,
  medium: 60,
  advanced: 60,
  olympic: 90,
  legendary: 90,
};

export function createGame({ mount }) {
  let destroyFn = () => {};

  return {
    start() {
      let disposed = false;
      let settings = defaultSettings();

      const state = {
        phase: "loading",
        boardIndex: 1,
        unlockedBoard: 1,
        taskIndex: 1,
        tasksPerBoard: DEFAULT_BOARD_LENGTH,
        divisionId: DEFAULT_DIVISION_ID,
        difficultyId: DEFAULT_DIFFICULTY_ID,
        division: getDivision(DEFAULT_DIVISION_ID),
        difficulty: getDifficulty(DEFAULT_DIFFICULTY_ID),
        score: 0,
        bestScore: 0,
        bestStars: 0,
        runStars: 0,
        taskStarsEarned: 0,
        username: "",
        usernameKey: "",
        profiles: {},
        profileMessage: "Welcome",
        settings,
        soundOn: true,
        tutorialSeen: false,
        tutorialStep: 0,
        showTutorial: false,
        retriesLeft: MAX_RETRIES,
        usedNudge: false,
        attempts: 0,
        firstTry: true,
        shake: false,
        round: null,
        expression: "",
        feedback: {
          kind: "neutral",
          text: "Use cards without repeating them to match the target.",
          detail: "",
        },
        correction: null,
        usedCounts: new Map(),
        result: null,
        leaderboard: [],
        resume: null,
        storageReady: false,
        timerLimit: TIMER_LIMITS.easy,
        timeLeft: TIMER_LIMITS.easy,
        timerExpired: false,
        awaitingStart: true,
        chasePose: "idle",
      };

      let timerIntervalId = null;
      const audio = createAudio(() => state.soundOn);

      state.round = makeRound(state);

      const ui = createUI({
        mount,
        handlers: {
          onStart,
          onPuzzleGo,
          onAppend,
          onBackspace,
          onClear,
          onSubmit,
          onHintOrNext,
          onNewGame,
          onUsernameInput,
          onToggleSound,
          onTutorialNext,
          onTutorialSkip,
          onSwitchPlayer,
        },
      });

      render();
      boot();

      destroyFn = () => {
        disposed = true;
        stopPuzzleTimer();
        audio.dispose();
        ui.destroy();
        mount.replaceChildren();
      };

      async function boot() {
        await wait(120);
        if (disposed) return;
        const saved = loadState();
        state.profiles = saved.profiles;
        state.resume = saved.resume;
        settings = saved.settings;
        state.settings = settings;
        state.soundOn = settings.sound !== false;
        state.tasksPerBoard = DEFAULT_BOARD_LENGTH;
        applyUsername(saved.lastUsername || "");
        state.storageReady = true;

        if (state.usernameKey) {
          const resume =
            state.resume && state.resume.usernameKey === state.usernameKey ? state.resume : null;
          if (resume) {
            state.boardIndex = resume.boardIndex;
            state.taskIndex = resume.taskIndex;
            state.score = resume.score;
            state.runStars = resume.runStars;
          } else {
            state.boardIndex = state.unlockedBoard;
            state.taskIndex = 1;
            state.score = 0;
            state.runStars = 0;
          }
          state.round = makeRound(state);
          state.phase = "playing";
          state.feedback = {
            kind: "neutral",
            text: "Tap Start to reveal the target.",
            detail: `Board ${state.boardIndex} · Task ${state.taskIndex}/${state.tasksPerBoard}`,
          };
          state.correction = null;
          ui.hideStartOverlay();
          persist();
          startPuzzleTimer();
          render();
          return;
        }

        state.round = makeRound(state);
        state.phase = "ready";
        state.feedback = {
          kind: "neutral",
          text: "Enter a name to save your progress.",
          detail: "Progress stays on this device until cloud save is added.",
        };
        state.correction = null;
        render();
      }

      function onStart() {
        if (state.phase !== "ready") return;
        if (!state.usernameKey) {
          state.feedback = {
            kind: "bad",
            text: "Enter your name to begin.",
            detail: "Use a different name for another saved profile.",
          };
          render();
          return;
        }
        resetTaskFlags();
        state.boardIndex = state.unlockedBoard;
        state.taskIndex = 1;
        state.score = 0;
        state.runStars = 0;
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.phase = "playing";
        state.showTutorial = !state.tutorialSeen;
        state.tutorialStep = state.showTutorial ? 1 : 0;
        state.feedback = {
          kind: "neutral",
          text: "Tap Start to reveal the target.",
          detail: "",
        };
        state.correction = null;
        state.resume = buildResume();
        ui.hideStartOverlay();
        startPuzzleTimer();
        render();
        audio.unlockFromGesture();
        vibrate(12);
        persist();
      }

      function onSwitchPlayer() {
        stopPuzzleTimer();
        state.phase = "ready";
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.correction = null;
        state.showTutorial = false;
        state.feedback = {
          kind: "neutral",
          text: "Switch player or keep your saved name.",
          detail: "Each name keeps its own board progress on this device.",
        };
        render();
      }

      function onNewGame() {
        state.phase = "playing";
        state.boardIndex = state.unlockedBoard;
        state.taskIndex = 1;
        state.score = 0;
        state.runStars = 0;
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.leaderboard = [];
        resetTaskFlags();
        state.feedback = {
          kind: "neutral",
          text: "Tap Start to reveal the target.",
          detail: "",
        };
        state.correction = null;
        state.resume = buildResume();
        startPuzzleTimer();
        render();
        persist();
      }

      function onPuzzleGo() {
        if (!isPlaying() || !state.awaitingStart || state.showTutorial) return;
        state.awaitingStart = false;
        state.chasePose = "running";
        state.feedback = {
          kind: "neutral",
          text: "Target revealed. Build your equation!",
          detail: retriesDetail(),
        };
        beginTimerTicks();
        audio.playBlip(720, { duration: 0.06, volume: 0.1 });
        vibrate(14);
        render();
      }

      function onAppend(fragment) {
        if (!isPlaying() || state.awaitingStart) return;
        state.expression = (
          needsSpaceBefore(state.expression, fragment)
            ? `${state.expression} ${fragment}`
            : `${state.expression}${fragment}`
        ).trimStart();
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "neutral",
          text: "Nice. Keep shaping the equation.",
          detail: retriesDetail(),
        };
        state.correction = null;
        if (state.showTutorial && state.tutorialStep === 1) state.tutorialStep = 2;
        render();
        audio.playBlip(560, { duration: 0.045, volume: 0.08 });
      }

      function onBackspace() {
        if (!isPlaying() || state.awaitingStart) return;
        state.expression = state.expression.trimEnd().slice(0, -1).trimEnd();
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.feedback = {
          kind: "neutral",
          text: "Adjust and try again.",
          detail: retriesDetail(),
        };
        state.correction = null;
        render();
      }

      function onClear() {
        if (!isPlaying() || state.awaitingStart) return;
        state.expression = "";
        state.usedCounts = new Map();
        state.feedback = {
          kind: "neutral",
          text: "Fresh equation. You’ve got this.",
          detail: retriesDetail(),
        };
        state.correction = null;
        render();
      }

      function onSubmit() {
        if (!isPlaying() || state.awaitingStart) return;
        state.attempts += 1;
        if (state.showTutorial && state.tutorialStep === 3) {
          // allow submit during tutorial
        }
        const result = evaluateSubmission(state.expression, state.round);

        if (!result.ok) {
          state.firstTry = false;
          if (state.retriesLeft > 0) {
            state.retriesLeft -= 1;
            state.shake = true;
            state.feedback = {
              kind: "bad",
              text: softNudge(result.reason),
              detail: `${state.retriesLeft} retr${state.retriesLeft === 1 ? "y" : "ies"} left`,
            };
            state.correction = null;
            audio.play("incorrect");
            vibrate(18);
            render();
            window.setTimeout(() => {
              state.shake = false;
              render();
            }, 400);
            return;
          }

          enterFailReview(result);
          return;
        }

        // Correct
        stopPuzzleTimer();
        state.chasePose = "safe";
        const stars = calcTaskStars({
          firstTry: state.firstTry && state.attempts <= 1,
          usedNudge: state.usedNudge,
          retriesUsed: MAX_RETRIES - state.retriesLeft,
        });
        state.taskStarsEarned = stars;
        state.runStars += stars;
        recordTaskStars(stars);

        state.phase = "review";
        state.score += POINTS_CORRECT;
        state.correction = buildCorrectCorrection(state.expression, state.round);
        state.feedback = {
          kind: "good",
          text: state.correction.solutions?.length > 1
            ? "Correct! Brilliant solve — here are other paths."
            : "Correct! Brilliant solve!",
          detail: `+${POINTS_CORRECT} · ★${stars} · Tap Next`,
        };
        if (state.showTutorial) {
          state.showTutorial = false;
          state.tutorialSeen = true;
          state.tutorialStep = 0;
        }
        audio.play("correct");
        audio.playBlip(880, { duration: 0.08, volume: 0.13 });
        vibrate(35);
        render();
      }

      function enterFailReview(result) {
        stopPuzzleTimer();
        const correction = buildWrongCorrection(state.expression, result, state.round);
        state.phase = "review";
        state.score = Math.max(0, state.score - POINTS_WRONG);
        state.expression = correction.solution;
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.taskStarsEarned = 1;
        state.runStars += 1;
        recordTaskStars(1);
        state.feedback = {
          kind: "bad",
          text: state.timerExpired
            ? "Time’s up! Here’s the solution."
            : result.reason || "Incorrect. Study the solution.",
          detail: `−${POINTS_WRONG} points · ★1 · Tap Next`,
        };
        state.correction = correction;
        audio.play("incorrect");
        vibrate(24);
        render();
      }

      function startPuzzleTimer() {
        stopPuzzleTimer();
        state.timerExpired = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
        state.timerLimit = TIMER_LIMITS[state.difficultyId] ?? TIMER_LIMITS.easy;
        state.timeLeft = state.timerLimit;
      }

      function beginTimerTicks() {
        stopPuzzleTimer();
        if (
          disposed ||
          state.phase !== "playing" ||
          state.showTutorial ||
          state.awaitingStart
        ) {
          return;
        }
        timerIntervalId = window.setInterval(() => {
          if (
            disposed ||
            state.phase !== "playing" ||
            state.showTutorial ||
            state.awaitingStart
          ) {
            return;
          }
          state.timeLeft = Math.max(0, state.timeLeft - 1);
          if (state.timeLeft <= 0) {
            onTimerExpire();
            return;
          }
          render();
        }, 1000);
      }

      function stopPuzzleTimer() {
        if (timerIntervalId != null) {
          window.clearInterval(timerIntervalId);
          timerIntervalId = null;
        }
      }

      function onTimerExpire() {
        if (!isPlaying() || state.timerExpired) return;
        state.timerExpired = true;
        state.timeLeft = 0;
        state.chasePose = "caught";
        enterFailReview({
          ok: false,
          reason: "Time’s up. Here’s the solution.",
        });
      }

      function onHintOrNext() {
        if (state.phase === "review") {
          advanceTask();
          return;
        }
        if (!isPlaying() || state.awaitingStart) return;

        if (state.usedNudge) {
          state.feedback = {
            kind: "skip",
            text: buildPuzzleNudge(state.round).text,
            detail: "Nudge already used on this puzzle.",
          };
          render();
          return;
        }

        state.usedNudge = true;
        state.firstTry = false;
        const nudge = buildPuzzleNudge(state.round);
        state.feedback = {
          kind: "skip",
          text: nudge.text,
          detail: nudge.detail,
        };
        audio.play("skip");
        render();
      }

      function advanceTask() {
        if (state.taskIndex >= state.tasksPerBoard) {
          finishBoard();
          return;
        }
        state.taskIndex += 1;
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.phase = "playing";
        resetTaskFlags();
        state.feedback = {
          kind: "neutral",
          text: "Tap Start to reveal the target.",
          detail: "",
        };
        state.correction = null;
        state.resume = buildResume();
        startPuzzleTimer();
        render();
        persist();
      }

      function finishBoard() {
        stopPuzzleTimer();
        state.phase = "finished";
        state.result = getRank(state.score);
        const finishedBoard = state.boardIndex;
        if (finishedBoard >= state.unlockedBoard) {
          state.unlockedBoard = finishedBoard + 1;
        }
        state.bestScore = Math.max(state.bestScore, state.score);
        state.bestStars = Math.max(state.bestStars, state.runStars);
        state.leaderboard = topProfilesByScore(
          {
            ...state.profiles,
            [state.usernameKey]: {
              name: state.username,
              bestScore: state.bestScore,
              unlockedBoard: state.unlockedBoard,
              bestStars: state.bestStars,
            },
          },
          5
        );
        state.feedback = {
          kind: "good",
          text: `Board ${finishedBoard} complete!`,
          detail: `Board ${state.unlockedBoard} unlocked · ★${state.runStars} this run`,
        };
        state.correction = null;
        state.resume = null;
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
        state.hintLabel = state.phase === "review" ? "Next" : "Nudge";
        ui.render(state, options);
      }

      function onToggleSound() {
        state.soundOn = !state.soundOn;
        settings.sound = state.soundOn;
        state.settings = settings;
        persistSettings();
        if (state.soundOn) {
          audio.unlockFromGesture();
          audio.playBlip(660, { duration: 0.05, volume: 0.08 });
        }
        render();
      }

      function onTutorialNext() {
        if (!state.showTutorial) return;
        if (state.tutorialStep < 3) {
          state.tutorialStep += 1;
        } else {
          state.showTutorial = false;
          state.tutorialSeen = true;
          state.tutorialStep = 0;
          persist();
        }
        render();
      }

      function onTutorialSkip() {
        state.showTutorial = false;
        state.tutorialSeen = true;
        state.tutorialStep = 0;
        persist();
        render();
      }

      function onUsernameInput(value) {
        if (!["loading", "ready"].includes(state.phase)) return;
        applyUsername(value);
        state.round = makeRound(state);
        state.feedback = {
          kind: state.usernameKey ? "neutral" : "bad",
          text: state.usernameKey
            ? `Welcome, ${state.username}.`
            : "Enter a name to save progress.",
          detail: state.usernameKey
            ? `Board ${state.unlockedBoard} unlocked · Best ${state.bestScore}`
            : "Progress stays on this device.",
        };
        if (state.usernameKey) persist();
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
          state.bestStars = fresh.bestStars;
          state.tutorialSeen = false;
          state.boardIndex = fresh.unlockedBoard;
          state.profileMessage = "Welcome";
          return;
        }

        const profile = state.profiles[key] || { name: trimmed, ...emptyProfile() };
        if (!state.profiles[key]) {
          state.profiles[key] = {
            name: trimmed,
            ...emptyProfile(),
          };
        }
        state.bestScore = profile.bestScore;
        state.unlockedBoard = profile.unlockedBoard;
        state.bestStars = profile.bestStars || 0;
        state.tutorialSeen = Boolean(profile.tutorialSeen);
        state.boardIndex = profile.unlockedBoard;
        state.profileMessage = "Welcome";
      }

      function buildResume() {
        if (!state.usernameKey) return null;
        if (!["playing", "review"].includes(state.phase)) return null;
        return {
          usernameKey: state.usernameKey,
          boardIndex: state.boardIndex,
          taskIndex: state.taskIndex,
          score: state.score,
          runStars: state.runStars,
        };
      }

      function persist() {
        if (!state.storageReady) return;
        if (!state.usernameKey) {
          persistSettings();
          return;
        }
        const existing = state.profiles[state.usernameKey] || emptyProfile();
        state.profiles[state.usernameKey] = {
          name: state.username,
          bestScore: state.bestScore,
          unlockedBoard: state.unlockedBoard,
          bestStars: Math.max(existing.bestStars || 0, state.bestStars || 0),
          tutorialSeen: state.tutorialSeen,
          taskStars: existing.taskStars || {},
        };
        if (["playing", "review"].includes(state.phase)) {
          state.resume = buildResume();
        }
        saveState({
          profiles: state.profiles,
          lastUsername: state.username,
          settings,
          resume: state.resume,
        });
      }

      function persistSettings() {
        if (!state.storageReady) return;
        saveState({
          profiles: state.profiles,
          lastUsername: state.username,
          settings,
          resume: state.resume,
        });
      }

      function recordTaskStars(stars) {
        if (!state.usernameKey) return;
        const profile = state.profiles[state.usernameKey] || {
          name: state.username,
          ...emptyProfile(),
        };
        const key = `${state.boardIndex}-${state.taskIndex}-${state.divisionId}-${state.difficultyId}`;
        const prev = Number(profile.taskStars?.[key]) || 0;
        if (!profile.taskStars) profile.taskStars = {};
        if (stars > prev) profile.taskStars[key] = stars;
        state.profiles[state.usernameKey] = profile;
      }

      function resetRun(message) {
        state.phase = state.phase === "ready" ? "ready" : "playing";
        state.taskIndex = 1;
        state.score = 0;
        state.runStars = 0;
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        resetTaskFlags();
        state.feedback = {
          kind: "neutral",
          text: message,
          detail: state.division.gradeLabel,
        };
        state.correction = null;
        render();
      }

      function resetTaskFlags() {
        state.retriesLeft = MAX_RETRIES;
        state.usedNudge = false;
        state.attempts = 0;
        state.firstTry = true;
        state.taskStarsEarned = 0;
        state.shake = false;
        state.timerExpired = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
      }

      function retriesDetail() {
        return state.retriesLeft < MAX_RETRIES
          ? `${state.retriesLeft} retr${state.retriesLeft === 1 ? "y" : "ies"} left`
          : "";
      }

      function vibrate(ms) {
        try {
          if (navigator.vibrate) navigator.vibrate(ms);
        } catch {
          // Ignore
        }
      }
    },

    destroy() {
      destroyFn();
      destroyFn = () => {};
    },
  };
}

/** Shared path: Boards 1–5 stay Easy; then difficulty rises board by board. */
function applyLevelProgression(state, effectiveBoard) {
  const board = Math.max(1, effectiveBoard);
  if (board <= 5) {
    state.difficultyId = "easy";
    state.divisionId = DIVISIONS[0].id;
  } else {
    const difficultyIndex = Math.min(DIFFICULTIES.length - 1, board - 5);
    const divisionIndex = Math.min(DIVISIONS.length - 1, Math.floor((board - 1) / 2));
    state.difficultyId = DIFFICULTIES[difficultyIndex].id;
    state.divisionId = DIVISIONS[divisionIndex].id;
  }
  state.difficulty = getDifficulty(state.difficultyId);
  state.division = getDivision(state.divisionId);
}

/** Wrapper: bump effective boardIndex for late tasks without changing puzzle.js. */
function makeRound(state) {
  applyLevelProgression(state, state.boardIndex);
  const ramp = Math.floor((state.taskIndex - 1) / 10);
  return createRound({
    boardIndex: state.boardIndex + ramp,
    taskIndex: state.taskIndex,
    divisionId: state.divisionId,
    difficultyId: state.difficultyId,
  });
}

function calcTaskStars({ firstTry, usedNudge, retriesUsed }) {
  if (firstTry && !usedNudge && retriesUsed === 0) return 3;
  return 2;
}

function softNudge(reason) {
  if (reason && /card|repeat|equation|parenthesis|Division/i.test(reason)) {
    return `${reason} Try a different grouping.`;
  }
  return "Not quite — try regrouping with parentheses.";
}

function buildPuzzleNudge(round) {
  const target = round.targetLabel || round.target;
  const cards = (round.cards || []).map((card) => card.label).join(", ");
  const sol = String(round.exampleSolution || "").replace(/\s+/g, "");
  const match = sol.match(/(\d+(?:\/\d+)?)([+\-*/])(\d+(?:\/\d+)?)/);
  const opMap = { "+": "+", "-": "−", "*": "×", "/": "÷" };

  if (match) {
    const op = opMap[match[2]] || match[2];
    return {
      text: `Nudge: try ${match[1]} ${op} ${match[3]} first.`,
      detail: cards
        ? `Cards on board: ${cards} · Target ${target}`
        : `Aim for ${target}`,
    };
  }

  return {
    text: `Nudge: combine cards toward ${target}.`,
    detail: cards ? `Cards on board: ${cards}` : "Try a different grouping with ( ).",
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
