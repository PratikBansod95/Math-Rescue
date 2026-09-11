import {
  DIVISIONS,
  DIFFICULTIES,
  DEFAULT_DIVISION_ID,
  DEFAULT_DIFFICULTY_ID,
  createRound,
  createAdaptiveRound,
  countUsedCards,
  evaluateSubmission,
  findAlternateSolutions,
  getDivision,
  getDifficulty,
  getRank,
  needsSpaceBefore,
  displayExpression,
  formatNumber,
  journeyDifficultyForLevel,
} from "./puzzle.js";
import { createDailyRound } from "./dailyChallenges.js";
import {
  normalizeBrain,
  planNextPuzzle,
  recordBrainRun,
  brainStatusText,
  computeSkill,
  usesBrainForJourney,
} from "./gameBrain.js";
import { createUI } from "./ui.js";
import { createConfirmDialog } from "./confirm.js";
import { createAudio } from "./audio.js";
import { loadState, saveState, clearAllState, emptyProfile, normalizeUsername, defaultSettings, topProfilesByScore } from "./storage.js";
import {
  fetchPlayer,
  savePlayer,
  deletePlayer,
  fetchLeaderboard,
  registerPlayer,
  submitDaily,
  remoteToLocalProfile,
  leaderboardToUi,
} from "./api.js";
import {
  POINTS_CORRECT,
  POINTS_WRONG,
  bestBoardRating,
  calcTaskStars,
  calcLevelCoinReward,
  HINT_COST,
} from "./scoring.js";
import { ensurePlayerIdentity } from "./playerIdentity.js";
import { validateNickname } from "./nicknameValidation.js";
import {
  utcDateKey,
  hasCompletedToday,
  markDailyAttempted,
  normalizeDaily,
  calcDailyCareerBonus,
  formatDailyCountdown,
  msUntilNextDaily,
  buildDailyShareText,
  dailyPuzzleNumber,
} from "./daily.js";

const MAX_RETRIES = 2;
const LEADERBOARD_PANEL_LIMIT = 100;

const TIMER_LIMITS = {
  easy: 90,
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
        levelIndex: 1,
        unlockedBoard: 1,
        puzzleVariant: 0,
        reviewOutcome: null,
        divisionId: DEFAULT_DIVISION_ID,
        difficultyId: DEFAULT_DIFFICULTY_ID,
        division: getDivision(DEFAULT_DIVISION_ID),
        difficulty: getDifficulty(DEFAULT_DIFFICULTY_ID),
        score: 0,
        bestScore: 0,
        coins: 0,
        freeHintUsed: false,
        coinsEarnedThisLevel: 0,
        bestStars: 0,
        runStars: 0,
        taskStarsEarned: 0,
        username: "",
        usernameKey: "",
        playerId: "",
        playerToken: "",
        registered: false,
        nicknameError: "",
        nicknamePending: false,
        nicknameValid: false,
        playerRank: null,
        menuLeaderboardOpen: false,
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
        timerDeadline: 0,
        timerExpired: false,
        awaitingStart: true,
        chasePose: "idle",
        boardStars: {},
        menuSettingsOpen: false,
        menuHowToOpen: false,
        menuJourneyOpen: false,
        menuToast: "",
        syncStatus: "idle",
        canResume: false,
        gameMode: "journey",
        dailyDateKey: utcDateKey(),
        dailyCompletedToday: false,
        dailyTodayResult: null,
        dailyResult: null,
        menuDailyOpen: false,
        brainSkill: 12,
        brainMessage: "",
        dailyElapsedSeconds: 0,
      };

      let timerIntervalId = null;
      let catchTimeoutId = null;
      let toastTimerId = null;
      let remoteSyncTimerId = null;
      let timerPausedRemaining = null;
      const audio = createAudio(() => state.soundOn);

      state.round = makeRound(state);

      const ui = createUI({
        mount,
        handlers: {
          onConfirmNickname,
          onChangeName,
          onPuzzleGo,
          onAppend,
          onBackspace,
          onClear,
          onSubmit,
          onHintOrNext,
          onNewGame,
          onPlayFromMenu,
          onSelectBoard,
          onOpenMenu,
          onOpenMenuSettings,
          onCloseMenuSettings,
          onResetAll,
          onOpenHowTo,
          onCloseHowTo,
          onOpenJourney,
          onCloseJourney,
          onOpenLeaderboard,
          onCloseLeaderboard,
          onOpenDaily,
          onCloseDaily,
          onStartDaily,
          onDailyContinue,
          onDailyShare,
          onUsernameInput,
          onToggleSound,
          onTutorialSkip,
          onEscape,
        },
      });

      const confirm = createConfirmDialog();

      document.addEventListener("visibilitychange", onVisibilityChange);
      document.addEventListener("keydown", onDocumentKeydown);

      render();
      boot();

      destroyFn = () => {
        disposed = true;
        stopPuzzleTimer();
        clearCatchTimeout();
        window.clearTimeout(toastTimerId);
        window.clearTimeout(remoteSyncTimerId);
        document.removeEventListener("visibilitychange", onVisibilityChange);
        document.removeEventListener("keydown", onDocumentKeydown);
        confirm.destroy();
        audio.dispose();
        ui.destroy();
        mount.replaceChildren();
      };

      function onDocumentKeydown(event) {
        if (event.key === "Escape") onEscape();
      }

      function askConfirm(options) {
        return confirm.ask(options);
      }

      async function boot() {
        await wait(120);
        if (disposed) return;
        const saved = loadState();
        state.profiles = saved.profiles;
        state.resume = saved.resume;
        settings = saved.settings;
        state.settings = settings;
        state.soundOn = settings.sound !== false;
        applyUsername(saved.lastUsername || "");
        state.storageReady = true;

        if (state.usernameKey) {
          applyProfileToState(state.profiles[state.usernameKey] || emptyProfile());
          const validation = validateNickname(state.username);
          if (!validation.ok) {
            state.phase = "nickname";
            state.nicknameError = validation.message;
            state.nicknameValid = false;
            state.round = makeRound(state);
            render();
            return;
          }
          state.nicknameValid = true;
          await syncFromRemote();
          if (disposed) return;
          state.levelIndex = state.unlockedBoard;
          state.puzzleVariant = 0;
          state.score = 0;
          state.runStars = 0;
          if (!resumeIsValid(state.resume)) state.resume = null;
          state.canResume = resumeIsValid(state.resume);
          state.round = makeRound(state);
          state.correction = null;
          goToMenu();
          persist({ remote: false });
          return;
        }

        state.round = makeRound(state);
        state.phase = "nickname";
        state.feedback = {
          kind: "neutral",
          text: "Enter a name to save your progress.",
          detail: "Progress syncs to the cloud when online, and stays on this device offline.",
        };
        state.correction = null;
        render();
      }

      async function onConfirmNickname() {
        if (state.phase !== "nickname" || state.nicknamePending) return;
        const validation = validateNickname(state.username);
        if (!validation.ok) {
          state.nicknameError = validation.message;
          render();
          return;
        }

        const nickname = validation.nickname;
        state.username = nickname;
        state.usernameKey = normalizeUsername(nickname);
        let profile = ensurePlayerIdentity(
          state.profiles[state.usernameKey] || { name: nickname, ...emptyProfile() },
        );
        profile.name = nickname;
        state.profiles[state.usernameKey] = profile;
        applyProfileToState(profile);

        state.nicknamePending = true;
        state.nicknameError = "";
        render();

        try {
          const player = await registerPlayer(
            {
              playerId: profile.playerId,
              nickname,
              localBestScore: profile.bestScore,
              localUnlockedBoard: profile.unlockedBoard,
              localBestStars: profile.bestStars,
              localBoardStars: profile.boardStars,
              localTutorialSeen: profile.tutorialSeen,
              localCoins: profile.coins || 0,
            },
            profile.playerToken,
          );
          if (player) {
            applyRemotePlayer(player);
            profile = state.profiles[state.usernameKey];
          }
          state.profiles[state.usernameKey] = {
            ...profile,
            registered: true,
          };
          state.registered = true;
        } catch (error) {
          if (error.status === 409 && error.field === "nickname") {
            state.nicknameError = "That nickname is already taken. Try a different one.";
          } else if (error.status === 0) {
            state.nicknameError = "Offline — saved on this device only for now.";
            state.profiles[state.usernameKey] = {
              ...state.profiles[state.usernameKey],
              name: nickname,
            };
          } else {
            state.nicknameError = error.message || "Could not save your nickname right now.";
          }
          state.nicknamePending = false;
          render();
          if (error.status !== 0) return;
        }

        state.nicknamePending = false;
        resetTaskFlags();
        state.levelIndex = state.unlockedBoard;
        state.puzzleVariant = 0;
        state.score = 0;
        state.runStars = 0;
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.correction = null;
        state.resume = null;
        goToMenu();
        persist();
        await refreshLeaderboard(LEADERBOARD_PANEL_LIMIT);
        audio.unlockFromGesture();
        vibrate(12);
      }

      function onOpenLeaderboard() {
        if (state.phase !== "menu" && state.phase !== "daily_finished") return;
        state.menuLeaderboardOpen = true;
        render();
        void refreshLeaderboard(LEADERBOARD_PANEL_LIMIT);
      }

      function onCloseLeaderboard() {
        state.menuLeaderboardOpen = false;
        render();
      }

      function applyProfileToState(profile) {
        state.bestScore = profile.bestScore;
        state.coins = profile.coins || 0;
        state.freeHintUsed = Boolean(profile.freeHintUsed);
        state.unlockedBoard = profile.unlockedBoard;
        state.boardStars = { ...(profile.boardStars || {}) };
        state.bestStars = bestBoardRating(state.boardStars);
        state.tutorialSeen = Boolean(profile.tutorialSeen);
        state.levelIndex = profile.unlockedBoard;
        state.playerId = profile.playerId || "";
        state.playerToken = profile.playerToken || "";
        state.registered = Boolean(profile.registered);
        syncDailyFromProfile(profile);
        syncBrainFromProfile(profile);
      }

      function syncBrainFromProfile(profile = currentProfile()) {
        const brain = normalizeBrain(profile?.brain);
        state.brainSkill = computeSkill(profile || {}, brain);
        state.brainMessage = brain.lastMessage || brainStatusText(brain, profile || {});
      }

      function getBrain() {
        return normalizeBrain(currentProfile()?.brain);
      }

      function writeBrainToProfile(brain) {
        if (!state.usernameKey) return;
        const profile = ensurePlayerIdentity(state.profiles[state.usernameKey] || emptyProfile());
        state.profiles[state.usernameKey] = {
          ...profile,
          brain: normalizeBrain(brain),
        };
        syncBrainFromProfile(state.profiles[state.usernameKey]);
      }

      function recordBrainRunToProfile(run) {
        const profile = currentProfile() || emptyProfile();
        const brain = recordBrainRun(getBrain(), { ...run, at: Date.now() }, profile);
        writeBrainToProfile(brain);
      }

      function syncDailyFromProfile(profile = currentProfile()) {
        const daily = normalizeDaily(profile?.daily);
        const dateKey = utcDateKey();
        state.dailyDateKey = dateKey;
        state.dailyTodayResult =
          daily.todayResult?.dateKey === dateKey ? daily.todayResult : null;
        state.dailyCompletedToday = hasCompletedToday(daily, dateKey);
      }

      function writeDailyToProfile(daily) {
        if (!state.usernameKey) return;
        const profile = ensurePlayerIdentity(state.profiles[state.usernameKey] || emptyProfile());
        state.profiles[state.usernameKey] = {
          ...profile,
          daily: normalizeDaily(daily),
        };
        syncDailyFromProfile(state.profiles[state.usernameKey]);
      }

      function currentProfile() {
        if (!state.usernameKey) return null;
        return state.profiles[state.usernameKey] || null;
      }

      function onChangeName() {
        stopPuzzleTimer();
        clearCatchTimeout();
        persist({ remote: false });
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.phase = "nickname";
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.correction = null;
        state.showTutorial = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
        state.feedback = {
          kind: "neutral",
          text: "Switch player or keep your saved name.",
          detail: "Each name keeps its own level progress on this device.",
        };
        render();
      }

      function goToMenu({ openJourney = false } = {}) {
        if (["playing", "review"].includes(state.phase) && state.gameMode === "journey") {
          state.resume = buildResume();
        }
        stopPuzzleTimer();
        clearCatchTimeout();
        timerPausedRemaining = null;
        state.phase = "menu";
        state.gameMode = "journey";
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = Boolean(openJourney);
        state.menuLeaderboardOpen = false;
        state.menuDailyOpen = false;
        state.dailyResult = null;
        state.menuToast = "";
        state.showTutorial = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
        state.timerExpired = false;
        state.result = null;
        state.expression = "";
        state.usedCounts = new Map();
        state.correction = null;
        state.canResume = resumeIsValid(state.resume);
        state.levelIndex = state.unlockedBoard;
        syncDailyFromProfile();
        syncBrainFromProfile();
        state.leaderboard = topProfilesByScore(state.profiles, 3).filter(
          (entry) => (entry.bestScore || 0) > 0
        );
        state.feedback = {
          kind: "neutral",
          text: "Ready when you are.",
          detail: "",
        };
        render();
        refreshLeaderboard(3);
      }

      async function onOpenMenu() {
        if (!["playing", "review", "finished", "daily_finished"].includes(state.phase)) return;
        if (state.phase === "daily_finished") {
          onDailyContinue();
          return;
        }
        if (state.phase === "playing" || state.phase === "review") {
          const ok = await askConfirm({
            title: state.gameMode === "daily" ? "Leave Daily Challenge?" : "Leave this puzzle?",
            message:
              state.gameMode === "daily"
                ? "You only get one official daily attempt per day. Leaving now will forfeit today's challenge."
                : "Your level progress is saved. You can continue later from the menu.",
            confirmLabel: "Yes, leave",
            cancelLabel: "No",
          });
          if (!ok) return;
          if (state.gameMode === "daily") {
            stopPuzzleTimer();
            state.gameMode = "journey";
            state.phase = "menu";
            state.reviewOutcome = null;
            state.correction = null;
            goToMenu();
            persist();
            return;
          }
        }
        goToMenu();
        persist();
      }

      function onPlayFromMenu() {
        if (state.phase !== "menu") return;
        if (resumeIsValid(state.resume)) {
          startLevel(resumeLevel(state.resume), { resume: true });
          return;
        }
        startLevel(state.unlockedBoard);
      }

      function onSelectBoard(level) {
        if (state.phase !== "menu") return;
        const picked = Math.floor(Number(level));
        if (!Number.isFinite(picked) || picked < 1) return;
        if (picked > state.unlockedBoard) {
          showMenuToast(`Clear level ${state.unlockedBoard} to unlock this one`);
          return;
        }
        const resumeHere =
          resumeIsValid(state.resume) && resumeLevel(state.resume) === picked;
        if (resumeIsValid(state.resume) && resumeLevel(state.resume) !== picked) {
          state.resume = null;
          state.canResume = false;
        }
        startLevel(picked, { resume: resumeHere });
      }

      function startLevel(levelIndex, { resume = false } = {}) {
        if (state.phase !== "menu") return;
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = false;
        state.phase = "playing";
        state.reviewOutcome = null;
        const resuming = Boolean(resume) && resumeIsValid(state.resume);
        if (resuming) {
          state.levelIndex = resumeLevel(state.resume);
          state.puzzleVariant = resumeVariant(state.resume);
          state.score = Number(state.resume.score) || 0;
          state.runStars = Number(state.resume.runStars) || 0;
          state.showTutorial = false;
          state.tutorialStep = 0;
        } else {
          state.levelIndex = Math.max(1, levelIndex);
          state.puzzleVariant = 0;
          state.score = 0;
          state.runStars = 0;
          state.showTutorial = !state.tutorialSeen;
          state.tutorialStep = state.showTutorial ? 1 : 0;
        }
        state.round = makeRound(state);
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.coinsEarnedThisLevel = 0;
        resetTaskFlags();
        state.feedback = {
          kind: "neutral",
          text: resuming
            ? `Welcome back to level ${state.levelIndex}.`
            : "Tap Start to reveal the target.",
          detail: resuming ? "Tap Start to continue." : "",
        };
        state.correction = null;
        state.resume = buildResume();
        state.canResume = true;
        startPuzzleTimer();
        render();
        persist();
        audio.unlockFromGesture();
        vibrate(12);
      }

      function onNewGame() {
        const nextLevel = (state.levelIndex || 1) + 1;
        state.phase = "menu";
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = false;
        state.menuLeaderboardOpen = false;
        startLevel(nextLevel);
        persist();
      }

      function onOpenMenuSettings() {
        if (state.phase !== "menu") return;
        state.menuHowToOpen = false;
        state.menuSettingsOpen = true;
        render();
      }

      function onCloseMenuSettings() {
        state.menuSettingsOpen = false;
        render();
      }

      async function onResetAll() {
        const confirmed = await askConfirm({
          title: "Reset all progress?",
          message:
            "This clears every saved player on this device and deletes cloud progress from the server. You will return to the name screen at level 1. This cannot be undone.",
          confirmLabel: "Yes, reset",
          cancelLabel: "No",
          danger: true,
        });
        if (!confirmed) return;

        state.menuSettingsOpen = false;

        const profileKeys = [
          ...new Set([
            ...Object.keys(state.profiles || {}),
            ...(state.usernameKey ? [state.usernameKey] : []),
          ]),
        ];

        stopPuzzleTimer();
        clearCatchTimeout();
        window.clearTimeout(remoteSyncTimerId);
        window.clearTimeout(toastTimerId);

        let cloudError = false;
        for (const key of profileKeys) {
          const profile = state.profiles[key];
          try {
            await deletePlayer(key, {
              playerId: profile?.playerId,
              playerToken: profile?.playerToken,
            });
          } catch (error) {
            if (error.status !== 404) cloudError = true;
          }
        }

        clearAllState();
        settings = defaultSettings();
        state.settings = settings;
        state.soundOn = settings.sound !== false;
        state.profiles = {};
        state.resume = null;
        state.canResume = false;
        state.leaderboard = [];
        state.username = "";
        state.usernameKey = "";
        state.bestScore = 0;
        state.coins = 0;
        state.freeHintUsed = false;
        state.coinsEarnedThisLevel = 0;
        state.unlockedBoard = 1;
        state.bestStars = 0;
        state.boardStars = {};
        state.tutorialSeen = false;
        state.showTutorial = false;
        state.tutorialStep = 0;
        state.levelIndex = 1;
        state.puzzleVariant = 0;
        state.score = 0;
        state.runStars = 0;
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.correction = null;
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = false;
        state.menuToast = "";
        state.syncStatus = cloudError ? "offline" : "ok";
        state.awaitingStart = true;
        state.chasePose = "idle";
        state.timerExpired = false;
        resetTaskFlags();
        state.round = makeRound(state);
        state.phase = "nickname";
        state.feedback = {
          kind: cloudError ? "bad" : "neutral",
          text: "Enter a name to save your progress.",
          detail: cloudError
            ? "This device was reset, but cloud progress could not be deleted. Try again when online."
            : "Progress was cleared on this device and in the cloud.",
        };
        saveState({
          profiles: {},
          lastUsername: "",
          settings,
          resume: null,
        });
        render();
      }

      function onOpenHowTo() {
        if (state.phase !== "menu") return;
        state.menuSettingsOpen = false;
        state.menuHowToOpen = true;
        render();
      }

      function onCloseHowTo() {
        state.menuHowToOpen = false;
        render();
      }

      function onOpenJourney() {
        if (state.phase !== "menu") return;
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = true;
        render();
      }

      function onCloseJourney() {
        state.menuJourneyOpen = false;
        render();
      }

      function onEscape() {
        if (confirm.isOpen()) {
          confirm.cancel();
          return;
        }
        if (state.menuSettingsOpen) {
          onCloseMenuSettings();
          return;
        }
        if (state.menuHowToOpen) {
          onCloseHowTo();
          return;
        }
        if (state.menuJourneyOpen) {
          onCloseJourney();
          return;
        }
        if (state.menuLeaderboardOpen) {
          onCloseLeaderboard();
          return;
        }
        if (state.menuDailyOpen) {
          onCloseDaily();
          return;
        }
      }

      function onOpenDaily() {
        if (state.phase !== "menu") return;
        state.menuDailyOpen = true;
        render();
      }

      function onCloseDaily() {
        state.menuDailyOpen = false;
        render();
      }

      function onStartDaily() {
        if (state.phase !== "menu") return;
        syncDailyFromProfile();
        if (state.dailyCompletedToday) {
          if (state.dailyTodayResult) {
            state.menuDailyOpen = false;
            state.phase = "daily_finished";
            state.dailyResult = buildDailyResultView(state.dailyTodayResult);
            render();
            return;
          }
          state.menuDailyOpen = false;
          showMenuToast(
            `Daily Challenge locked · resets in ${formatDailyCountdown(msUntilNextDaily())}`,
          );
          render();
          return;
        }
        state.menuDailyOpen = false;
        state.gameMode = "daily";
        state.menuSettingsOpen = false;
        state.menuHowToOpen = false;
        state.menuJourneyOpen = false;
        state.phase = "playing";
        state.reviewOutcome = null;
        state.puzzleVariant = 0;
        state.score = 0;
        state.runStars = 0;
        state.showTutorial = false;
        state.tutorialStep = 0;
        state.dailyDateKey = utcDateKey();
        const attemptedDaily = markDailyAttempted(
          normalizeDaily(currentProfile()?.daily),
          state.dailyDateKey,
        );
        writeDailyToProfile(attemptedDaily);
        state.round = createDailyRound(state.dailyDateKey);
        const config = state.round.dailyConfig || { timer: 75 };
        state.divisionId = config.divisionId;
        state.difficultyId = config.difficultyId;
        state.division = getDivision(config.divisionId);
        state.difficulty = getDifficulty(config.difficultyId);
        resetTaskFlags();
        state.expression = "";
        state.usedCounts = new Map();
        state.result = null;
        state.correction = null;
        state.resume = null;
        state.canResume = false;
        state.dailyElapsedSeconds = 0;
        state.feedback = {
          kind: "neutral",
          text: "Daily Challenge — one expert puzzle for everyone today.",
          detail: config.label || "Solve it for +5 career points.",
        };
        startDailyTimer(config.timer || 75);
        render();
        persist({ remote: false });
        audio.unlockFromGesture();
        vibrate(12);
      }

      function startDailyTimer(limit) {
        stopPuzzleTimer();
        clearCatchTimeout();
        timerPausedRemaining = null;
        state.timerExpired = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
        state.timerLimit = limit;
        state.timeLeft = limit;
        state.timerDeadline = 0;
      }

      function buildDailyResultView(todayResult) {
        const dateKey = todayResult?.dateKey || state.dailyDateKey || utcDateKey();
        const succeeded = Boolean(todayResult?.succeeded);
        const careerBonus = Number(todayResult?.careerBonus) || 0;
        return {
          dateKey,
          puzzleNumber: dailyPuzzleNumber(dateKey),
          stars: Number(todayResult?.stars) || 1,
          timeSeconds: Number(todayResult?.timeSeconds) || 0,
          careerBonus,
          succeeded,
          totalScore: state.bestScore,
          shareText: buildDailyShareText({
            dateKey,
            stars: todayResult?.stars,
            timeSeconds: todayResult?.timeSeconds,
            succeeded,
            careerBonus,
          }),
          resetsIn: formatDailyCountdown(msUntilNextDaily()),
        };
      }

      function finishDaily() {
        stopPuzzleTimer();
        const succeeded = state.reviewOutcome === "success";
        const dateKey = state.dailyDateKey || utcDateKey();
        const stars = state.taskStarsEarned || state.runStars || 1;
        const secondsLeft = Math.max(0, Number(state.timeLeft) || 0);
        const timeSeconds = Math.max(
          0,
          state.dailyElapsedSeconds || state.timerLimit - secondsLeft,
        );
        const careerBonus = calcDailyCareerBonus(succeeded);
        const profile = currentProfile();
        const currentDaily = normalizeDaily(profile?.daily);
        const todayResult = {
          dateKey,
          stars,
          timeSeconds,
          careerBonus,
          succeeded,
        };
        const nextDaily = {
          ...markDailyAttempted(currentDaily, dateKey),
          todayResult,
        };
        writeDailyToProfile(nextDaily);
        if (careerBonus > 0) {
          state.bestScore += careerBonus;
        }
        state.profiles[state.usernameKey] = {
          ...ensurePlayerIdentity(state.profiles[state.usernameKey] || emptyProfile()),
          bestScore: state.bestScore,
          daily: nextDaily,
        };
        state.phase = "daily_finished";
        state.gameMode = "journey";
        state.reviewOutcome = null;
        state.correction = null;
        state.dailyResult = buildDailyResultView(todayResult);
        state.feedback = succeeded
          ? {
              kind: "good",
              text: `Daily Challenge complete! +${careerBonus} career pts`,
              detail: `Total score ${state.bestScore}`,
            }
          : {
              kind: "bad",
              text: "Daily Challenge over",
              detail: "No bonus this time — try again tomorrow.",
            };
        render();
        if (succeeded) {
          audio.playBlip(660, { duration: 0.1, volume: 0.12 });
          audio.playBlip(990, { duration: 0.13, volume: 0.12 });
        }
        persist();
        void refreshLeaderboard(3);
        void submitDailyToCloud({
          profile: state.profiles[state.usernameKey],
          dateKey,
          stars,
          timeSeconds,
          succeeded,
          dailyMeta: nextDaily,
        });
      }

      async function submitDailyToCloud({ profile, dateKey, stars, timeSeconds, succeeded, dailyMeta }) {
        if (!profile?.playerId || !profile?.playerToken) {
          scheduleRemoteSync();
          return;
        }
        try {
          const payload = await submitDaily(
            {
              playerId: profile.playerId,
              dateKey,
              stars,
              timeSeconds,
              succeeded,
              dailyMeta,
            },
            profile.playerToken,
          );
          if (payload?.bestScore != null) {
            state.bestScore = Math.max(state.bestScore || 0, Number(payload.bestScore) || 0);
            state.profiles[state.usernameKey] = {
              ...state.profiles[state.usernameKey],
              bestScore: state.bestScore,
            };
            persist();
          }
        } catch (error) {
          if (error.status !== 409) {
            scheduleRemoteSync();
          }
        }
      }

      function onDailyContinue() {
        goToMenu();
        persist();
      }

      async function onDailyShare() {
        const text = state.dailyResult?.shareText || buildDailyShareText();
        try {
          if (navigator.share) {
            await navigator.share({ text, title: "Daily Challenge" });
            return;
          }
        } catch {
          // fall through to clipboard
        }
        try {
          await navigator.clipboard.writeText(text);
          showMenuToast("Result copied!");
        } catch {
          showMenuToast("Could not share result");
        }
      }

      function onComingSoon() {
        onOpenDaily();
      }

      function showMenuToast(text) {
        state.menuToast = text;
        render();
        window.clearTimeout(toastTimerId);
        toastTimerId = window.setTimeout(() => {
          if (disposed) return;
          state.menuToast = "";
          render();
        }, 1600);
      }

      function onPuzzleGo() {
        if (!isPlaying() || !state.awaitingStart) return;
        state.awaitingStart = false;
        if (state.showTutorial && state.tutorialStep === 1) state.tutorialStep = 2;
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
        if (!isPlaying() || state.awaitingStart || state.timerExpired) return;
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
        if (state.showTutorial) {
          if (state.tutorialStep === 2 && !isOperatorFragment(fragment)) {
            state.tutorialStep = 3;
          } else if (state.tutorialStep === 3 && isOperatorFragment(fragment)) {
            state.tutorialStep = 4;
          }
        }
        render();
        audio.playBlip(560, { duration: 0.045, volume: 0.08 });
      }

      function onBackspace() {
        if (!isPlaying() || state.awaitingStart || state.timerExpired) return;
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
        if (!isPlaying() || state.awaitingStart || state.timerExpired) return;
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
        if (!isPlaying() || state.awaitingStart || state.timerExpired) return;
        state.attempts += 1;
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
        state.dailyElapsedSeconds = Math.max(0, state.timerLimit - Math.max(0, state.timeLeft));
        const stars = calcTaskStars({
          firstTry: state.firstTry && state.attempts <= 1,
          usedNudge: state.usedNudge,
          retriesUsed: MAX_RETRIES - state.retriesLeft,
        });
        state.taskStarsEarned = stars;
        state.runStars = stars;
        recordTaskStars(stars);

        state.phase = "review";
        state.reviewOutcome = "success";
        state.score += POINTS_CORRECT;
        state.correction = buildCorrectCorrection(state.expression, state.round);
        state.feedback = {
          kind: "good",
          text: state.correction.solutions?.length > 1
            ? "Correct! Brilliant solve — here are other paths."
            : "Correct! Brilliant solve!",
          detail: state.gameMode === "daily"
            ? `★${stars} · Tap Next`
            : `+${POINTS_CORRECT} · ★${stars} · Tap Next`,
        };
        if (state.showTutorial) {
          state.showTutorial = false;
          state.tutorialSeen = true;
          state.tutorialStep = 0;
          persist();
        }
        audio.play("correct");
        audio.playBlip(880, { duration: 0.08, volume: 0.13 });
        vibrate(35);
        render();
      }

      function enterFailReview(result) {
        clearCatchTimeout();
        stopPuzzleTimer();
        const correction = buildWrongCorrection(state.expression, result, state.round);
        state.phase = "review";
        state.reviewOutcome = "fail";
        if (state.gameMode !== "daily") {
          state.score = Math.max(0, state.score - POINTS_WRONG);
        } else {
          state.dailyElapsedSeconds = Math.max(state.timerLimit, state.dailyElapsedSeconds || 0);
        }
        state.expression = correction.solution;
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.taskStarsEarned = 1;
        state.runStars = 1;
        recordTaskStars(1);
        state.feedback = {
          kind: "bad",
          text: state.timerExpired
            ? "Time’s up! The shark caught the cat. Here’s the solution."
            : result.reason || "Incorrect. Study the solution.",
          detail: state.gameMode === "daily"
            ? "Tap Next to finish today's challenge"
            : `−${POINTS_WRONG} points · New puzzle on Next`,
        };
        state.correction = correction;
        if (state.gameMode !== "daily") {
          recordBrainRunToProfile({
            mode: "journey",
            levelIndex: state.levelIndex,
            ok: false,
            stars: 1,
            secondsLeft: Math.max(0, Number(state.timeLeft) || 0),
            usedHint: state.usedNudge,
            retriesUsed: Math.max(0, MAX_RETRIES - (state.retriesLeft || 0)),
          });
        }
        if (state.showTutorial && state.tutorialStep === 4) {
          state.showTutorial = false;
          state.tutorialSeen = true;
          state.tutorialStep = 0;
          persist();
          ensureTimerRunning();
        }
        if (!state.timerExpired) {
          audio.play("incorrect");
          vibrate(24);
        }
        render();
      }

      function startPuzzleTimer() {
        stopPuzzleTimer();
        clearCatchTimeout();
        timerPausedRemaining = null;
        state.timerExpired = false;
        state.awaitingStart = true;
        state.chasePose = "idle";
        if (state.gameMode === "daily") {
          const config = state.round?.dailyConfig;
          startDailyTimer(config?.timer || 75);
          return;
        }
        state.timerLimit = TIMER_LIMITS[state.difficultyId] ?? TIMER_LIMITS.easy;
        state.timeLeft = state.timerLimit;
        state.timerDeadline = 0;
      }

      function beginTimerTicks(remainingSeconds) {
        stopPuzzleTimer();
        if (
          disposed ||
          state.phase !== "playing" ||
          state.showTutorial ||
          state.awaitingStart
        ) {
          return;
        }
        const seconds =
          Number.isFinite(remainingSeconds) && remainingSeconds > 0
            ? remainingSeconds
            : state.timerLimit;
        state.timerDeadline = performance.now() + seconds * 1000;
        state.timeLeft = Math.ceil(seconds);
        timerIntervalId = window.setInterval(() => {
          if (
            disposed ||
            state.phase !== "playing" ||
            state.showTutorial ||
            state.awaitingStart
          ) {
            return;
          }
          const left = Math.max(
            0,
            Math.ceil((state.timerDeadline - performance.now()) / 1000)
          );
          state.timeLeft = left;
          if (left <= 0) {
            onTimerExpire();
            return;
          }
          render();
        }, 250);
      }

      function stopPuzzleTimer() {
        if (timerIntervalId != null) {
          window.clearInterval(timerIntervalId);
          timerIntervalId = null;
        }
      }

      function ensureTimerRunning() {
        if (
          disposed ||
          !isPlaying() ||
          state.awaitingStart ||
          state.timerExpired ||
          state.showTutorial ||
          state.timerDeadline > 0
        ) {
          return;
        }
        beginTimerTicks(state.timeLeft || state.timerLimit);
      }

      function clearCatchTimeout() {
        if (catchTimeoutId != null) {
          window.clearTimeout(catchTimeoutId);
          catchTimeoutId = null;
        }
      }

      function onTimerExpire() {
        if (!isPlaying() || state.timerExpired) return;
        state.timerExpired = true;
        state.timeLeft = 0;
        state.timerDeadline = performance.now();
        state.chasePose = "caught";
        stopPuzzleTimer();
        audio.play("incorrect");
        vibrate(28);
        render();
        clearCatchTimeout();
        /* 1) swallow  2) post-eat celebration  3) fail review */
        catchTimeoutId = window.setTimeout(() => {
          if (disposed || state.phase !== "playing" || !state.timerExpired) return;
          state.chasePose = "ate";
          render();
          catchTimeoutId = window.setTimeout(() => {
            catchTimeoutId = null;
            if (disposed || state.phase !== "playing" || !state.timerExpired) return;
            enterFailReview({
              ok: false,
              reason: "Time’s up. Here’s the solution.",
            });
          }, 1100);
        }, 780);
      }

      async function onHintOrNext() {
        if (state.phase === "review") {
          if (state.gameMode === "daily") {
            finishDaily();
            return;
          }
          if (state.reviewOutcome === "fail") {
            retryLevelWithNewPuzzle();
          } else {
            finishLevel();
          }
          return;
        }
        if (!isPlaying() || state.awaitingStart || state.timerExpired) return;

        if (state.usedNudge) {
          state.feedback = {
            kind: "skip",
            text: buildPuzzleNudge(state.round).text,
            detail: "Hint already used on this puzzle.",
          };
          render();
          return;
        }

        const isFreeHint = !state.freeHintUsed;

        if (!isFreeHint && (state.coins || 0) < HINT_COST) {
          state.feedback = {
            kind: "bad",
            text: "Not enough coins",
            detail: `Hints cost ${HINT_COST} coins. You have ${state.coins || 0}.`,
          };
          render();
          return;
        }

        const confirmed = await askConfirm(
          isFreeHint
            ? {
                title: "Your first hint is free!",
                message:
                  "This is your first free hint — no coins needed. After this, hints cost 10 coins each.",
                confirmLabel: "Use free hint",
                cancelLabel: "No",
              }
            : {
                title: "Use a hint?",
                message: `This hint costs ${HINT_COST} coins. You have ${state.coins} coins.`,
                confirmLabel: "Yes",
                cancelLabel: "No",
              },
        );
        if (!confirmed || disposed) return;

        if (isFreeHint) {
          state.freeHintUsed = true;
        } else {
          state.coins -= HINT_COST;
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
        persist();
      }

      function retryLevelWithNewPuzzle() {
        state.puzzleVariant = (state.puzzleVariant || 0) + 1;
        const brainRound = usesBrainForJourney(state.puzzleVariant);
        state.phase = "playing";
        state.reviewOutcome = null;
        state.expression = "";
        state.usedCounts = new Map();
        state.correction = null;
        state.runStars = 0;
        state.taskStarsEarned = 0;
        resetTaskFlags();
        state.round = makeRound(state, { brainReason: brainRound ? "retry" : undefined });
        state.feedback = {
          kind: "neutral",
          text: brainRound
            ? "Rescue Brain crafted a new puzzle."
            : "New puzzle — try again!",
          detail: brainRound ? state.brainMessage || "" : "",
        };
        state.resume = buildResume();
        startPuzzleTimer();
        render();
        persist();
      }

      function finishLevel() {
        stopPuzzleTimer();
        recordBrainRunToProfile({
          mode: "journey",
          levelIndex: state.levelIndex,
          ok: true,
          stars: state.taskStarsEarned || state.runStars || 2,
          secondsLeft: Math.max(0, Number(state.timeLeft) || 0),
          usedHint: state.usedNudge,
          retriesUsed: Math.max(0, MAX_RETRIES - (state.retriesLeft || 0)),
        });
        state.phase = "finished";
        const finishedLevel = state.levelIndex;
        const earned = state.taskStarsEarned || state.runStars || 1;
        if (finishedLevel >= state.unlockedBoard) {
          state.unlockedBoard = finishedLevel + 1;
        }
        state.bestScore += Math.max(0, state.score);
        const coinsEarned = calcLevelCoinReward(earned);
        if (coinsEarned > 0) {
          state.coins = (state.coins || 0) + coinsEarned;
        }
        state.coinsEarnedThisLevel = coinsEarned;
        const prevStars = Number(state.boardStars?.[finishedLevel]) || 0;
        state.boardStars = {
          ...(state.boardStars || {}),
          [finishedLevel]: Math.max(prevStars, earned),
        };
        state.bestStars = bestBoardRating(state.boardStars);
        state.result = getRank(state.bestScore);
        state.leaderboard = topProfilesByScore(
          {
            ...state.profiles,
            [state.usernameKey]: {
              name: state.username,
              bestScore: state.bestScore,
              unlockedBoard: state.unlockedBoard,
              bestStars: state.bestStars,
              boardStars: state.boardStars,
            },
          },
          5
        );
        state.feedback = {
          kind: "good",
          text: `Level ${finishedLevel} complete!`,
          detail: coinsEarned
            ? `★${earned} · +${coinsEarned} coins · Level ${state.unlockedBoard} unlocked · Total ${state.bestScore}`
            : `★${earned} · Level ${state.unlockedBoard} unlocked · Total ${state.bestScore}`,
        };
        state.correction = null;
        state.resume = null;
        state.canResume = false;
        state.reviewOutcome = null;
        render();
        audio.playBlip(660, { duration: 0.1, volume: 0.12 });
        audio.playBlip(990, { duration: 0.13, volume: 0.12 });
        persist();
        refreshLeaderboard(3);
      }

      function isPlaying() {
        return state.phase === "playing";
      }

      function render(options = {}) {
        state.usedCounts = countUsedCards(state.expression, state.round.cards);
        state.hintLabel =
          state.phase === "review"
            ? state.gameMode === "daily"
              ? "Finish"
              : state.reviewOutcome === "fail"
                ? "Try again"
                : "Next"
            : "Hint";
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

      function onTutorialSkip() {
        if (!state.showTutorial) return;
        state.showTutorial = false;
        state.tutorialSeen = true;
        state.tutorialStep = 0;
        persist();
        ensureTimerRunning();
        render();
      }

      function onUsernameInput(value) {
        if (!["loading", "nickname"].includes(state.phase)) return;
        applyUsername(value);
        const validation = validateNickname(state.username);
        state.nicknameValid = validation.ok;
        state.nicknameError = validation.ok ? "" : validation.message;
        state.round = makeRound(state);
        if (state.usernameKey) persist({ remote: false });
        render();
      }

      function applyUsername(value) {
        const trimmed = value.trim().replace(/\s+/g, " ").slice(0, 8);
        const key = normalizeUsername(trimmed);
        state.username = trimmed;
        state.usernameKey = key;

        if (!key) {
          const fresh = emptyProfile();
          applyProfileToState(fresh);
          state.boardStars = {};
          state.profileMessage = "Welcome";
          state.nicknameValid = false;
          state.nicknameError = "";
          return;
        }

        let profile = ensurePlayerIdentity(state.profiles[key] || { name: trimmed, ...emptyProfile() });
        if (!state.profiles[key]) {
          profile = ensurePlayerIdentity({ name: trimmed, ...emptyProfile() });
          state.profiles[key] = profile;
        } else {
          profile = ensurePlayerIdentity(profile);
          state.profiles[key] = profile;
        }
        applyProfileToState(profile);
        state.profileMessage = "Welcome";
      }

      function buildResume() {
        if (!state.usernameKey || state.gameMode === "daily") {
          return null;
        }
        if (!["playing", "review"].includes(state.phase)) return null;
        return {
          usernameKey: state.usernameKey,
          levelIndex: state.levelIndex,
          puzzleVariant: state.puzzleVariant || 0,
          score: state.score,
          runStars: state.runStars,
        };
      }

      function resumeIsValid(resume) {
        if (!resume || resume.usernameKey !== state.usernameKey) return false;
        const level = resumeLevel(resume);
        if (!Number.isFinite(level) || level < 1) return false;
        if (level > Math.max(1, state.unlockedBoard || 1)) return false;
        return true;
      }

      function persist({ remote = true } = {}) {
        if (!state.storageReady) return;
        if (!state.usernameKey) {
          persistSettings();
          return;
        }
        const existing = ensurePlayerIdentity(state.profiles[state.usernameKey] || emptyProfile());
        state.profiles[state.usernameKey] = ensurePlayerIdentity({
          ...existing,
          name: state.username,
          bestScore: state.bestScore,
          coins: Math.max(0, state.coins || 0),
          freeHintUsed: Boolean(state.freeHintUsed),
          unlockedBoard: state.unlockedBoard,
          bestStars: bestBoardRating({
            ...(existing.boardStars || {}),
            ...(state.boardStars || {}),
          }),
          tutorialSeen: state.tutorialSeen,
          taskStars: existing.taskStars || {},
          boardStars: { ...(existing.boardStars || {}), ...(state.boardStars || {}) },
          daily: normalizeDaily(existing.daily),
          playerId: state.playerId || existing.playerId,
          playerToken: state.playerToken || existing.playerToken,
          registered: state.registered || existing.registered,
        });
        if (["playing", "review"].includes(state.phase) && state.gameMode === "journey") {
          state.resume = buildResume();
        }
        saveState({
          profiles: state.profiles,
          lastUsername: state.username,
          settings,
          resume: state.resume,
        });
        if (remote) scheduleRemoteSync();
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

      function applyRemotePlayer(player) {
        const remote = remoteToLocalProfile(player);
        if (!remote || !state.usernameKey) return;
        const existing = state.profiles[state.usernameKey] || emptyProfile();
        const boardStars = { ...(existing.boardStars || {}) };
        for (const [board, stars] of Object.entries(remote.boardStars || {})) {
          boardStars[board] = Math.max(Number(boardStars[board]) || 0, Number(stars) || 0);
        }
        state.bestScore = Math.max(state.bestScore || 0, remote.bestScore || 0);
        state.unlockedBoard = Math.max(state.unlockedBoard || 1, remote.unlockedBoard || 1);
        state.tutorialSeen = Boolean(state.tutorialSeen || remote.tutorialSeen);
        state.boardStars = boardStars;
        state.bestStars = bestBoardRating(boardStars);
        state.levelIndex = state.unlockedBoard;
        const coins = Math.max(
          0,
          Number(existing.coins) || 0,
          Number(remote.coins) || 0,
          Number(state.coins) || 0,
        );
        const freeHintUsed = Boolean(existing.freeHintUsed || state.freeHintUsed);
        const remoteDaily = normalizeDaily(remote.daily);
        const mergedDaily = normalizeDaily({
          ...normalizeDaily(existing.daily),
          attemptedDate: remoteDaily.attemptedDate || normalizeDaily(existing.daily).attemptedDate,
          todayResult: remoteDaily.todayResult || normalizeDaily(existing.daily).todayResult,
        });
        state.coins = coins;
        state.profiles[state.usernameKey] = ensurePlayerIdentity({
          ...existing,
          name: remote.name || state.username,
          bestScore: state.bestScore,
          coins,
          freeHintUsed,
          unlockedBoard: state.unlockedBoard,
          bestStars: state.bestStars,
          tutorialSeen: state.tutorialSeen,
          taskStars: existing.taskStars || {},
          boardStars,
          daily: mergedDaily,
          playerId: remote.playerId || existing.playerId,
          playerToken: existing.playerToken,
          registered: Boolean(remote.playerId || existing.registered),
        });
        if (remote.name) state.username = remote.name;
        applyProfileToState(state.profiles[state.usernameKey]);
      }

      async function syncFromRemote() {
        if (!state.usernameKey) return;
        try {
          const player = await fetchPlayer(state.usernameKey);
          if (player) applyRemotePlayer(player);
          state.syncStatus = "ok";
        } catch {
          state.syncStatus = "offline";
        }
      }

      function scheduleRemoteSync() {
        window.clearTimeout(remoteSyncTimerId);
        remoteSyncTimerId = window.setTimeout(() => {
          syncToRemote();
        }, 700);
      }

      function syncToRemote() {
        if (!state.usernameKey) return;
        const profile = state.profiles[state.usernameKey];
        if (!profile) return;
        savePlayer({
          usernameKey: state.usernameKey,
          playerId: profile.playerId,
          playerToken: profile.playerToken,
          name: profile.name || state.username,
          unlockedBoard: profile.unlockedBoard,
          bestScore: profile.bestScore,
          bestStars: profile.bestStars,
          boardStars: profile.boardStars,
          coins: profile.coins,
          tutorialSeen: profile.tutorialSeen,
          daily: profile.daily,
        })
          .then(() => {
            if (!disposed) state.syncStatus = "ok";
          })
          .catch(() => {
            if (!disposed) state.syncStatus = "offline";
          });
      }

      async function refreshLeaderboard(limit = 10) {
        const profile = currentProfile();
        try {
          const payload = await fetchLeaderboard(limit, profile?.playerId || state.playerId || "");
          if (disposed) return;
          if (payload.entries.length) {
            state.leaderboard = leaderboardToUi(payload);
            state.playerRank = payload.playerEntry;
            if (["menu", "finished"].includes(state.phase)) render();
            return;
          }
        } catch {
          // fall through to local
        }
        if (disposed) return;
        state.playerRank = null;
        state.leaderboard = topProfilesByScore(state.profiles, limit)
          .filter((entry) => (entry.bestScore || 0) > 0)
          .map((entry, index) => ({
            rank: index + 1,
            name: entry.name,
            bestScore: entry.bestScore,
            unlockedBoard: entry.unlockedBoard,
            bestStars: entry.bestStars,
            isCurrentPlayer: normalizeUsername(entry.name) === state.usernameKey,
          }));
        if (["menu", "finished"].includes(state.phase)) render();
      }

      function recordTaskStars(stars) {
        if (!state.usernameKey) return;
        const profile = state.profiles[state.usernameKey] || {
          name: state.username,
          ...emptyProfile(),
        };
        const key = `${state.levelIndex}-v${state.puzzleVariant || 0}-${state.divisionId}-${state.difficultyId}`;
        const prev = Number(profile.taskStars?.[key]) || 0;
        if (!profile.taskStars) profile.taskStars = {};
        if (stars > prev) profile.taskStars[key] = stars;
        state.profiles[state.usernameKey] = profile;
      }

      function onVisibilityChange() {
        if (disposed) return;
        if (document.hidden) {
          pauseTimerForBackground();
          return;
        }
        resumeTimerFromBackground();
      }

      function pauseTimerForBackground() {
        if (!isPlaying() || state.awaitingStart || state.timerExpired || state.showTutorial) return;
        if (!state.timerDeadline) return;
        timerPausedRemaining = Math.max(0, (state.timerDeadline - performance.now()) / 1000);
        state.timeLeft = Math.ceil(timerPausedRemaining);
        stopPuzzleTimer();
        render();
      }

      function resumeTimerFromBackground() {
        if (timerPausedRemaining == null) return;
        const remaining = timerPausedRemaining;
        timerPausedRemaining = null;
        if (!isPlaying() || state.awaitingStart || state.timerExpired || state.showTutorial) return;
        if (remaining <= 0) {
          onTimerExpire();
          return;
        }
        beginTimerTicks(remaining);
        render();
      }

      function resetTaskFlags() {
        clearCatchTimeout();
        state.retriesLeft = MAX_RETRIES;
        state.usedNudge = false;
        state.attempts = 0;
        state.firstTry = true;
        state.taskStarsEarned = 0;
        state.shake = false;
        state.timerExpired = false;
        state.timerDeadline = 0;
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

function isOperatorFragment(fragment) {
  return /[+\-*/()]/.test(String(fragment || ""));
}

/** Shared path: slow kid-friendly ramp — whole numbers, easy puzzles early on. */
function applyLevelProgression(state, effectiveLevel) {
  const { divisionId, difficultyId } = journeyDifficultyForLevel(effectiveLevel);
  state.difficultyId = difficultyId;
  state.divisionId = divisionId;
  state.difficulty = getDifficulty(state.difficultyId);
  state.division = getDivision(state.divisionId);
}

function makeRound(state, { brainReason } = {}) {
  const variant = state.puzzleVariant || 0;
  const useBrain = state.gameMode !== "daily" && usesBrainForJourney(variant);

  if (useBrain) {
    const profile = state.profiles?.[state.usernameKey] || emptyProfile();
    const brain = normalizeBrain(profile.brain);
    const plan = planNextPuzzle(profile, brain, {
      reason: brainReason || "adaptive",
      levelIndex: state.levelIndex,
    });
    state.brainPlan = plan;
    state.brainMessage = plan.message;
    state.divisionId = plan.divisionId;
    state.difficultyId = plan.difficultyId;
    state.division = getDivision(plan.divisionId);
    state.difficulty = getDifficulty(plan.difficultyId);
    return createAdaptiveRound(plan);
  }

  state.brainPlan = null;
  state.brainMessage = "";
  applyLevelProgression(state, state.levelIndex);
  return createRound({
    levelIndex: state.levelIndex,
    puzzleVariant: variant,
    divisionId: state.divisionId,
    difficultyId: state.difficultyId,
  });
}

function resumeLevel(resume) {
  const level = Number(resume?.levelIndex ?? resume?.boardIndex);
  return Number.isFinite(level) ? Math.max(1, level) : 1;
}

function resumeVariant(resume) {
  const variant = Number(resume?.puzzleVariant);
  if (Number.isFinite(variant) && variant >= 0) return variant;
  const legacyTask = Number(resume?.taskIndex);
  return Number.isFinite(legacyTask) && legacyTask > 1 ? legacyTask - 1 : 0;
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
      text: `Hint: try ${match[1]} ${op} ${match[3]} first.`,
      detail: cards
        ? `Cards on board: ${cards} · Target ${target}`
        : `Aim for ${target}`,
    };
  }

  return {
    text: `Hint: combine cards toward ${target}.`,
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
