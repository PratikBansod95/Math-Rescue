import { createCatRunAnimator } from "./chaseCatRun.js";
import { levelStarPace } from "./scoring.js";
import { getDailyConfig } from "./puzzle.js";
import { dailyPuzzleNumber, formatDailyCountdown, msUntilNextDaily } from "./daily.js";
import { burstConfetti } from "./confetti.js";

const OPERATORS = [
  { label: "+", value: " + " },
  { label: "−", value: " - " },
  { label: "×", value: " * " },
  { label: "÷", value: " / " },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
];

const CARD_THEMES = [
  { position: "top", tone: "blue", icon: "calc" },
  { position: "left", tone: "purple", icon: "chart" },
  { position: "right", tone: "pink", icon: "abacus" },
  { position: "bottom", tone: "green", icon: "ruler" },
];

const TUTORIAL_COPY = {
  1: {
    title: "Start",
    body: "Tap Start in the center to reveal the target.",
  },
  2: {
    title: "Cards",
    body: "Tap a number card to add it to your equation.",
  },
  3: {
    title: "Operators",
    body: "Use +, −, ×, ÷ or ( ) from the pad below.",
  },
  4: {
    title: "Submit",
    body: "Hit Submit when all four cards equal the target.",
  },
};

const TUTORIAL_LAST_STEP = 4;

export function createUI({ mount, handlers }) {
  const shell = document.createElement("section");
  shell.className = "math-game game-surface";
  shell.innerHTML = template();
  mount.replaceChildren(shell);

  const els = {
    shell,
    playShell: shell.querySelector("[data-play-shell]"),
    menuScreen: shell.querySelector("[data-menu-screen]"),
    menuLevel: shell.querySelector("[data-menu-level]"),
    menuCoins: shell.querySelector("[data-menu-coins]"),
    menuPlayLevel: shell.querySelector("[data-menu-play-level]"),
    menuPlayTitle: shell.querySelector("[data-menu-play-title]"),
    menuPlay: shell.querySelector("[data-menu-play]"),
    menuPlayers: shell.querySelector("[data-menu-players]"),
    menuSettings: shell.querySelector("[data-menu-settings]"),
    menuHowTo: shell.querySelector("[data-menu-howto]"),
    menuJourney: shell.querySelector("[data-menu-journey]"),
    menuJourneyMount: shell.querySelector("[data-journey-mount]"),
    menuPath: shell.querySelector("[data-menu-path]"),
    menuMute: shell.querySelector("[data-menu-mute]"),
    menuMuteLabel: shell.querySelector("[data-menu-mute-label]"),
    menuSettingsPlayer: shell.querySelector("[data-menu-settings-player]"),
    menuSettingsSync: shell.querySelector("[data-menu-settings-sync]"),
    menuGreeting: shell.querySelector("[data-menu-greeting]"),
    menuToast: shell.querySelector("[data-menu-toast]"),
    streakValue: shell.querySelector("[data-streak]"),
    streakSegs: shell.querySelectorAll("[data-streak-seg]"),
    levelLabel: shell.querySelector("[data-level]"),
    levelTrack: shell.querySelector("[data-level-track]"),
    coins: shell.querySelector("[data-coins]"),
    timerChip: shell.querySelector("[data-timer-chip]"),
    timerValue: shell.querySelector("[data-timer]"),
    chasePanel: shell.querySelector("[data-chase]"),
    chaseTimer: shell.querySelector("[data-chase-timer]"),
    chaseBar: shell.querySelector("[data-chase-bar]"),
    chaseRailFill: shell.querySelector("[data-chase-rail-fill]"),
    chaseRailGlow: shell.querySelector("[data-chase-rail-glow]"),
    chaseCat: shell.querySelector("[data-chase-cat]"),
    chaseCatFrame: shell.querySelector("[data-chase-cat-frame]"),
    chaseShark: shell.querySelector("[data-chase-shark]"),
    bestScore: shell.querySelector("[data-best-score]"),
    welcome: shell.querySelector("[data-welcome]"),
    boardMeta: shell.querySelector("[data-board-meta]"),
    numbers: shell.querySelector("[data-numbers]"),
    input: shell.querySelector("[data-input]"),
    equationHint: shell.querySelector("[data-equation-hint]"),
    feedback: shell.querySelector("[data-feedback]"),
    feedbackDetail: shell.querySelector("[data-feedback-detail]"),
    correction: shell.querySelector("[data-correction]"),
    operatorPad: shell.querySelector("[data-operators]"),
    clearButton: shell.querySelector("[data-clear]"),
    submitButton: shell.querySelector("[data-submit]"),
    hintButton: shell.querySelector("[data-hint]"),
    hintLabel: shell.querySelector("[data-hint-label]"),
    menuButton: shell.querySelector("[data-menu]"),
    muteButton: shell.querySelector("[data-mute]"),
    playerButton: shell.querySelector("[data-player]"),
    nicknameOverlay: shell.querySelector("[data-nickname-overlay]"),
    nicknameContinue: shell.querySelector("[data-nickname-continue]"),
    usernameInput: shell.querySelector("[data-username]"),
    nicknameStatus: shell.querySelector("[data-nickname-status]"),
    nicknameError: shell.querySelector("[data-nickname-error]"),
    menuLeaderboard: shell.querySelector("[data-menu-leaderboard]"),
    menuLeaderboardList: shell.querySelector("[data-menu-leaderboard-list]"),
    menuLeaderboardPodium: shell.querySelector("[data-menu-leaderboard-podium]"),
    menuLeaderboardRank: shell.querySelector("[data-menu-leaderboard-rank]"),
    menuDaily: shell.querySelector("[data-menu-daily]"),
    menuDailyStatus: shell.querySelector("[data-menu-daily-status]"),
    menuDailyStreak: shell.querySelector("[data-menu-daily-streak]"),
    dailyResultOverlay: shell.querySelector("[data-daily-result]"),
    resultsOverlay: shell.querySelector("[data-results]"),
    resultScore: shell.querySelector("[data-result-score]"),
    resultStars: shell.querySelector("[data-result-stars]"),
    resultRank: shell.querySelector("[data-result-rank]"),
    resultMessage: shell.querySelector("[data-result-message]"),
    resultBest: shell.querySelector("[data-result-best]"),
    newGameButton: shell.querySelector("[data-new-game]"),
    coachTip: shell.querySelector("[data-coach-tip]"),
    coachStep: shell.querySelector("[data-coach-step]"),
    coachBody: shell.querySelector("[data-coach-body]"),
    coachSkip: shell.querySelector("[data-coach-skip]"),
    coachPointer: shell.querySelector("[data-coach-pointer]"),
    coachSvg: shell.querySelector("[data-coach-svg]"),
    coachPath: shell.querySelector("[data-coach-path]"),
    coachTap: shell.querySelector("[data-coach-tap]"),
  };

  let coachResizeObserver = null;
  let leaderboardBackdropGuard = false;

  const listeners = [];
  const celebrate = { lastPose: "", stop: null };
  const catRun = createCatRunAnimator({
    img: els.chaseCatFrame,
    panel: els.chasePanel,
    cat: els.chaseCat,
    shark: els.chaseShark,
    railFill: els.chaseRailFill,
    railGlow: els.chaseRailGlow,
    chaseTimer: els.chaseTimer,
    chaseBar: els.chaseBar,
  });
  buildOperatorPad(els.operatorPad, handlers.onAppend, handlers.onBackspace);

  if (typeof ResizeObserver !== "undefined" && els.playShell) {
    coachResizeObserver = new ResizeObserver(() => {
      if (coachLayoutState) layoutCoachPointer(els, coachLayoutState);
    });
    coachResizeObserver.observe(els.playShell);
  }

  on(els.nicknameContinue, "click", handlers.onConfirmNickname);
  on(els.usernameInput, "input", () => handlers.onUsernameInput(els.usernameInput.value));
  on(els.usernameInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handlers.onConfirmNickname();
    }
  });

  on(els.clearButton, "click", handlers.onClear);
  on(els.submitButton, "click", handlers.onSubmit);
  on(els.hintButton, "click", handlers.onHintOrNext);
  on(els.newGameButton, "click", handlers.onNewGame);
  on(els.muteButton, "click", handlers.onToggleSound);
  on(els.menuButton, "click", handlers.onOpenMenu);
  on(els.playerButton, "click", handlers.onChangeName);
  on(els.coachTip?.querySelector("[data-coach-skip]"), "click", handlers.onTutorialSkip);
  on(els.coachPointer, "click", () => {
    if (coachLayoutState?.showTutorial && coachLayoutState.tutorialStep === TUTORIAL_LAST_STEP) {
      handlers.onTutorialSkip?.();
    }
  });
  on(els.coachTip, "click", () => {
    if (coachLayoutState?.showTutorial && coachLayoutState.tutorialStep === TUTORIAL_LAST_STEP) {
      handlers.onTutorialSkip?.();
    }
  });

  for (const btn of shell.querySelectorAll("[data-menu-open-settings]")) {
    on(btn, "click", handlers.onOpenMenuSettings);
  }
  on(shell.querySelector("[data-menu-close-settings]"), "click", handlers.onCloseMenuSettings);
  on(shell.querySelector("[data-menu-reset]"), "click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void handlers.onResetAll?.();
  });
  on(shell.querySelector("[data-menu-open-howto]"), "click", handlers.onOpenHowTo);
  on(shell.querySelector("[data-menu-close-howto]"), "click", handlers.onCloseHowTo);
  on(shell.querySelector("[data-menu-open-journey]"), "click", handlers.onOpenJourney);
  on(shell.querySelector("[data-menu-close-journey]"), "click", handlers.onCloseJourney);
  on(shell.querySelector("[data-menu-open-leaderboard]"), "click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    leaderboardBackdropGuard = true;
    handlers.onOpenLeaderboard?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        leaderboardBackdropGuard = false;
      });
    });
  });
  on(shell.querySelector("[data-menu-close-leaderboard]"), "click", (event) => {
    event.stopPropagation();
    handlers.onCloseLeaderboard?.();
  });
  on(els.menuLeaderboard, "click", (event) => {
    if (leaderboardBackdropGuard) return;
    if (event.target === els.menuLeaderboard) handlers.onCloseLeaderboard?.();
  });
  on(els.menuLeaderboard?.querySelector(".league-panel"), "click", (event) => {
    event.stopPropagation();
  });
  on(shell.querySelector("[data-menu-open-daily]"), "click", handlers.onOpenDaily);
  on(shell.querySelector("[data-menu-close-daily]"), "click", (event) => {
    event.stopPropagation();
    handlers.onCloseDaily?.();
  });
  on(shell.querySelector("[data-menu-start-daily]"), "click", (event) => {
    event.stopPropagation();
    handlers.onStartDaily?.();
  });
  on(els.menuDaily, "click", (event) => {
    if (event.target === els.menuDaily) handlers.onCloseDaily?.();
  });
  on(els.menuDaily?.querySelector(".daily-panel"), "click", (event) => {
    event.stopPropagation();
  });
  on(shell.querySelector("[data-daily-continue]"), "click", handlers.onDailyContinue);
  on(shell.querySelector("[data-daily-share]"), "click", handlers.onDailyShare);
  on(shell.querySelector("[data-daily-open-ranks]"), "click", () => {
    handlers.onOpenLeaderboard?.();
  });
  on(els.menuJourneyMount, "click", (event) => {
    const btn = event.target.closest("[data-select-board]");
    if (!btn) return;
    handlers.onSelectBoard(Number(btn.dataset.selectBoard));
  });
  on(els.menuPath, "click", (event) => {
    const btn = event.target.closest("[data-select-board]");
    if (btn) {
      handlers.onSelectBoard(Number(btn.dataset.selectBoard));
      return;
    }
    handlers.onOpenJourney?.();
  });
  on(shell.querySelector("[data-menu-play]"), "click", handlers.onPlayFromMenu);
  on(window, "keydown", (event) => {
    if (event.key === "Escape") handlers.onEscape?.();
  });
  on(els.menuSettings, "click", (event) => {
    if (event.target === els.menuSettings) handlers.onCloseMenuSettings();
  });
  on(els.menuHowTo, "click", (event) => {
    if (event.target === els.menuHowTo) handlers.onCloseHowTo();
  });
  on(els.menuJourney, "click", (event) => {
    if (event.target === els.menuJourney) handlers.onCloseJourney();
  });
  on(els.menuMute, "click", handlers.onToggleSound);

  return {
    shell,
    render(state, options = {}) {
      shell.dataset.phase = state.phase;
      shell.classList.toggle("is-shaking", Boolean(state.shake));
      shell.classList.toggle("tutorial-on", Boolean(state.showTutorial));
      if (state.showTutorial) shell.dataset.tutorialStep = String(state.tutorialStep);
      else delete shell.dataset.tutorialStep;

      const onMenu = state.phase === "menu";
      if (els.playShell) els.playShell.hidden = onMenu;
      updateMenuScreen(els, state);
      updateNicknameOverlay(els, state);
      updateLeaderboardOverlay(els, state);
      updateDailyModal(els, state);
      updateDailyResult(els, state);
      if (onMenu) return;

      const segsOn = levelStarPace(state.runStars || 0);
      els.streakValue.textContent = String(state.runStars || 0);
      els.streakSegs.forEach((seg, index) => {
        seg.classList.toggle("is-on", index < segsOn);
      });

      els.levelLabel.textContent =
        state.gameMode === "daily" ? "DAILY CHALLENGE" : `LEVEL ${state.levelIndex}`;
      renderLevelTrack(els.levelTrack, state);

      els.coins.textContent = String(state.gameMode === "daily" ? state.bestScore : state.score);
      updateTimerChip(els, state);
      updateChase(els, state, catRun, celebrate);
      els.bestScore.textContent = String(state.bestScore);
      els.welcome.textContent = state.usernameKey
        ? `Welcome back, ${state.username}.`
        : "Welcome to Math Rescue.";
      els.boardMeta.textContent =
        state.gameMode === "daily"
          ? state.round?.dailyConfig?.label || "Daily puzzle"
          : `Level ${state.levelIndex}`;

      els.muteButton.classList.toggle("is-muted", !state.soundOn);
      els.muteButton.setAttribute("aria-label", state.soundOn ? "Mute sound" : "Unmute sound");
      if (els.playerButton) els.playerButton.hidden = true;

      if (document.activeElement !== els.usernameInput) {
        els.usernameInput.value = state.username;
      }

      const expression = state.expression.trim();
      els.input.textContent = expression || "";
      els.input.dataset.empty = expression ? "false" : "true";
      const targetLabel = state.round?.targetLabel || state.round?.target || "?";
      els.equationHint.innerHTML = `<span class="tip-ico" aria-hidden="true">💡</span><span>Use <b>all four cards</b> with <b>+ − × ÷</b> to make <b>${targetLabel}</b></span>`;

      els.feedback.textContent = state.feedback.text;
      els.feedback.dataset.kind = state.feedback.kind;
      els.feedbackDetail.textContent = state.feedback.detail || "";
      els.feedbackDetail.hidden = !state.feedback.detail;
      const feedbackLine = els.feedback.closest(".feedback-line");
      if (feedbackLine) {
        feedbackLine.hidden =
          state.phase === "playing" &&
          state.feedback.kind === "neutral" &&
          !state.feedback.detail;
      }

      renderCorrection(els.correction, state.correction);
      renderCards(els.numbers, state, handlers.onAppend, handlers.onPuzzleGo);
      updateControls(els, state);
      updateResults(els, state);
      updateCoachTip(els, state);
    },

    destroy() {
      if (typeof celebrate.stop === "function") celebrate.stop();
      catRun.destroy();
      coachResizeObserver?.disconnect();
      coachResizeObserver = null;
      coachLayoutState = null;
      for (const [el, type, fn] of listeners) {
        el.removeEventListener(type, fn);
      }
      listeners.length = 0;
    },
  };

  function on(el, type, fn) {
    if (!el) return;
    el.addEventListener(type, fn);
    listeners.push([el, type, fn]);
  }
}

function template() {
  return `
    <div class="menu-screen" data-menu-screen hidden>
      <div class="menu-screen__bg" aria-hidden="true">
        <div class="menu-screen__wash"></div>
        <div class="menu-screen__grid"></div>
        <div class="menu-screen__doodles" role="presentation" aria-hidden="true"></div>
        <div class="menu-screen__formulas" aria-hidden="true">
          <span class="menu-formula menu-formula--a">y = mx + c</span>
          <span class="menu-formula menu-formula--b">a² + b² = c²</span>
          <span class="menu-formula menu-formula--c">π ≈ 3.14</span>
          <span class="menu-formula menu-formula--d">(a+b)²</span>
          <span class="menu-formula menu-formula--e">1/2 + 1/3</span>
          <span class="menu-formula menu-formula--f">√x</span>
        </div>
        <img class="menu-screen__deco menu-screen__deco--cube" src="./assets/deco-cube.svg" alt="" />
        <img class="menu-screen__deco menu-screen__deco--ruler" src="./assets/deco-ruler.svg" alt="" />
        <i class="menu-screen__blob menu-screen__blob--a"></i>
        <i class="menu-screen__blob menu-screen__blob--b"></i>
      </div>
      <div class="menu-screen__scroll">
        <header class="menu-hud" aria-label="Menu status">
          <button class="menu-hud__menu menu-icon-btn" data-menu-open-settings type="button" aria-label="Menu and settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          </button>
          <div class="menu-hud__level" aria-label="Current level">
            <span class="menu-hud__level-tag">Level</span>
            <strong class="menu-hud__level-num" data-menu-level>1</strong>
          </div>
          <div class="menu-hud__score" title="Total score">
            <span class="menu-hud__score-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" fill="#fbbf24"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3M10 16h4v2H10zM9 20h6" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round"/></svg>
            </span>
            <strong class="menu-hud__score-val" data-menu-coins>0</strong>
          </div>
        </header>

        <div class="menu-hero">
          <h1 class="menu-logo" aria-label="Math Rescue">
            <svg class="menu-logo__svg" viewBox="0 0 420 168" role="img" aria-hidden="true">
              <defs>
                <linearGradient id="menuLogoMath" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#8eb6ff"/>
                  <stop offset="45%" stop-color="#4d8aff"/>
                  <stop offset="100%" stop-color="#2563eb"/>
                </linearGradient>
                <linearGradient id="menuLogoRescue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#ffe08a"/>
                  <stop offset="45%" stop-color="#ffb020"/>
                  <stop offset="100%" stop-color="#f59e0b"/>
                </linearGradient>
                <filter id="menuLogoDepth" x="-10%" y="-10%" width="120%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="#1e3a8a" flood-opacity=".22"/>
                </filter>
              </defs>
              <g filter="url(#menuLogoDepth)" font-family="Fredoka, Space Grotesk, Quicksand, sans-serif" font-weight="700" text-anchor="middle">
                <text class="menu-logo__outline" x="210" y="72" font-size="78">MATH</text>
                <text class="menu-logo__fill menu-logo__fill--math" x="210" y="72" font-size="78" fill="url(#menuLogoMath)">MATH</text>
                <text class="menu-logo__outline" x="210" y="148" font-size="78">RESCUE</text>
                <text class="menu-logo__fill menu-logo__fill--rescue" x="210" y="148" font-size="78" fill="url(#menuLogoRescue)">RESCUE</text>
              </g>
            </svg>
            <span class="menu-logo__fallback">
              <span class="menu-logo__math">MATH</span>
              <span class="menu-logo__rescue">RESCUE</span>
            </span>
          </h1>
          <p class="menu-ribbon"><span>SOLVE • RESCUE • LEVEL UP</span></p>
          <p class="menu-greeting" data-menu-greeting hidden></p>
          <div class="menu-scene" aria-hidden="true">
            <div class="menu-scene__frame">
              <img class="menu-scene__bg" src="./assets/chase/scene.png?v=belt-v2" alt="" />
              <div class="menu-scene__water"></div>
              <img class="menu-scene__shark" src="./assets/chase/shark.png?v=still1" alt="" />
              <img class="menu-scene__cat" src="./assets/chase/cat-run-still.png?v=face-right1" alt="" />
              <div class="menu-scene__glow"></div>
            </div>
          </div>
        </div>

        <button class="menu-play" data-menu-play type="button" aria-label="Play">
          <span class="menu-play__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 6.5v11l9-5.5-9-5.5Z" fill="currentColor"/></svg>
          </span>
          <span class="menu-play__copy">
            <strong data-menu-play-title>PLAY</strong>
            <small data-menu-play-level>LEVEL 1</small>
          </span>
        </button>

        <div class="menu-path" data-menu-path aria-label="Level progress"></div>

        <button class="menu-journey" data-menu-open-journey type="button">
          <span class="menu-journey__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e8f1ff"/><path d="M10 34l8-14 6 8 6-12 8 18H10Z" fill="#93c5fd"/><path d="M30 14v10l6-3-6-7Z" fill="#2563eb"/></svg>
          </span>
          <span class="menu-journey__copy">
            <strong>JOURNEY</strong>
            <small>Level map</small>
          </span>
          <span class="menu-journey__chev" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </span>
        </button>

        <div class="menu-features">
          <button class="menu-feature menu-feature--daily" data-menu-open-daily type="button">
            <span class="menu-feature__icon menu-feature__icon--daily" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#16a34a" stroke-width="2.2"/><circle cx="12" cy="12" r="5.2" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="12" cy="12" r="2.2" fill="#22c55e"/></svg>
            </span>
            <strong>DAILY CHALLENGE</strong>
            <small data-menu-daily-status>Play today</small>
          </button>
          <button class="menu-feature" data-menu-open-howto type="button">
            <span class="menu-feature__icon menu-feature__icon--howto" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#2563eb" stroke-width="2"/><path d="M12 10.5v6M12 7.5h.01" fill="none" stroke="#2563eb" stroke-width="2.4" stroke-linecap="round"/></svg>
            </span>
            <strong>HOW TO PLAY</strong>
            <small>Quick guide</small>
          </button>
        </div>

        <section class="menu-top-players" aria-label="Top players">
          <div class="menu-top-players__head">
            <h2>TOP PLAYERS</h2>
            <button class="menu-top-players__more" data-menu-open-leaderboard type="button">See ranks</button>
          </div>
          <p class="menu-daily-streak" data-menu-daily-streak hidden></p>
          <div class="menu-players" data-menu-players></div>
        </section>
      </div>

      <div class="menu-daily screen-overlay" data-menu-daily hidden>
        <div class="daily-panel screen-card" role="dialog" aria-modal="true" aria-labelledby="daily-panel-title">
          <p class="daily-panel__kicker">One puzzle · Everyone plays the same one</p>
          <h2 id="daily-panel-title">Daily Challenge <span data-daily-puzzle-num>#1</span></h2>
          <p class="daily-panel__flavor" data-daily-flavor>Today's challenge</p>
          <ul class="daily-panel__rules">
            <li>One attempt per UTC day — harder than journey levels</li>
            <li>Everyone gets the same expert puzzle</li>
            <li>Solve it for <strong>+5 career points</strong> added to your score</li>
          </ul>
          <button class="screen-btn screen-btn--primary" data-menu-start-daily type="button">Play today's challenge</button>
          <button class="screen-btn screen-btn--ghost" data-menu-close-daily type="button">Back</button>
        </div>
      </div>

      <div class="menu-leaderboard screen-overlay" data-menu-leaderboard hidden>
        <div class="league-panel screen-card" role="dialog" aria-modal="true" aria-labelledby="menu-leaderboard-title">
          <header class="league-panel__hero">
            <span class="league-panel__trophy" aria-hidden="true">🏆</span>
            <div class="league-panel__titles">
              <p class="league-panel__kicker">Global league</p>
              <h2 id="menu-leaderboard-title">Rescue League</h2>
            </div>
          </header>
          <div class="league-panel__you" data-menu-leaderboard-rank hidden>
            <span class="league-panel__you-label">Your rank</span>
            <strong class="league-panel__you-value"></strong>
          </div>
          <div class="league-panel__podium" data-menu-leaderboard-podium hidden></div>
          <div class="league-panel__table" aria-label="Leaderboard standings">
            <div class="league-panel__columns" data-menu-leaderboard-columns aria-hidden="true">
              <span>#</span>
              <span>Player</span>
              <span>Score</span>
            </div>
            <div class="league-panel__list" data-menu-leaderboard-list></div>
          </div>
          <button class="screen-btn screen-btn--primary league-panel__back" data-menu-close-leaderboard type="button">Back to menu</button>
        </div>
      </div>

      <div class="menu-settings screen-overlay" data-menu-settings hidden>
        <div class="screen-card menu-settings-card" role="dialog" aria-modal="true" aria-labelledby="menu-settings-title">
          <p class="menu-sheet__kicker">Options</p>
          <h2 id="menu-settings-title">Settings</h2>
          <p class="menu-settings__player" data-menu-settings-player>Player</p>
          <p class="menu-settings__sync" data-menu-settings-sync>Cloud sync checking…</p>
          <div class="menu-settings__rows">
            <button class="menu-settings__row" data-menu-mute type="button">
              <span class="menu-settings__row-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4V5Zm7.5 3.5a5 5 0 0 1 0 7M15 9.5a2.5 2.5 0 0 1 0 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
              <span class="menu-settings__row-copy">
                <strong>Sound</strong>
                <small data-menu-mute-label>On</small>
              </span>
            </button>
            <button class="menu-settings__row menu-settings__row--danger" data-menu-reset type="button">
              <span class="menu-settings__row-ico" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7h12Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 11v5M14 11v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
              </span>
              <span class="menu-settings__row-copy">
                <strong>Reset progress</strong>
                <small>Clears this device and cloud saves</small>
              </span>
            </button>
          </div>
          <p class="menu-settings__legal">
            <a href="./privacy.html" target="_blank" rel="noopener noreferrer">Privacy policy</a>
          </p>
          <button class="screen-btn screen-btn--ghost" data-menu-close-settings type="button">Close</button>
        </div>
      </div>

      <div class="menu-howto screen-overlay" data-menu-howto hidden>
        <div class="screen-card menu-howto-card" role="dialog" aria-modal="true" aria-labelledby="menu-howto-title">
          <div class="menu-howto__hero" aria-hidden="true">
            <img src="./assets/chase/cat-run-still.png?v=face-right1" alt="" />
          </div>
          <p class="menu-howto__kicker">Quick guide</p>
          <h2 id="menu-howto-title">How to play</h2>
          <p class="menu-howto__lead">Rescue the cat by solving equations before the shark reaches it.</p>
          <ol class="menu-howto__steps">
            <li>
              <span class="menu-howto__num" aria-hidden="true">1</span>
              <div>
                <strong>Tap Start</strong>
                <span>Reveal the target and start the chase timer.</span>
              </div>
            </li>
            <li>
              <span class="menu-howto__num" aria-hidden="true">2</span>
              <div>
                <strong>Build an equation</strong>
                <span>Use all four cards with + − × ÷ and parentheses.</span>
              </div>
            </li>
            <li>
              <span class="menu-howto__num" aria-hidden="true">3</span>
              <div>
                <strong>Submit your answer</strong>
                <span>Match the target before time runs out.</span>
              </div>
            </li>
            <li>
              <span class="menu-howto__num" aria-hidden="true">4</span>
              <div>
                <strong>Clear the board</strong>
                <span>Earn stars, unlock the next board, and keep the cat safe.</span>
              </div>
            </li>
          </ol>
          <button class="screen-btn screen-btn--primary" data-menu-close-howto type="button">Got it</button>
        </div>
      </div>

      <div class="menu-journey-overlay" data-menu-journey hidden>
        <div class="journey-shell" role="dialog" aria-modal="true" aria-labelledby="journey-title">
          <header class="journey-top">
            <button class="menu-icon-btn" data-menu-close-journey type="button" aria-label="Back to menu">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="journey-top__copy">
              <p>Your path</p>
              <h2 id="journey-title">Rescue Journey</h2>
            </div>
            <div class="journey-top__level" data-journey-hud-level>1</div>
          </header>
          <div class="journey-scroller">
            <div class="journey-mount" data-journey-mount></div>
          </div>
        </div>
      </div>
      <p class="menu-toast" data-menu-toast role="status" aria-live="polite" hidden>Coming soon</p>
    </div>

    <div class="play-shell" data-play-shell>
    <div class="coach-tip" data-coach-tip hidden aria-live="polite">
      <div class="coach-tip__bubble">
        <p class="coach-tip__label" data-coach-step>Start</p>
        <p class="coach-tip__body" data-coach-body>Tap Start in the center to reveal the target.</p>
        <button class="coach-tip__skip" data-coach-skip type="button">Skip tutorial</button>
      </div>
    </div>
    <div class="coach-pointer" data-coach-pointer hidden aria-hidden="true">
      <svg class="coach-pointer__svg" data-coach-svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path class="coach-pointer__path" data-coach-path />
      </svg>
      <div class="coach-pointer__tap" data-coach-tap>
        <span class="coach-pointer__ring"></span>
        <span class="coach-pointer__hand" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M9 11V6a1.5 1.5 0 1 1 3 0v4h1V5.5a1.5 1.5 0 1 1 3 0V11h1V8a1.5 1.5 0 1 1 3 0v6.2c0 2.8-1.6 5.4-4.1 6.6l-3.2 1.4a2 2 0 0 1-2.6-1.1l-1.2-2.4a2 2 0 0 1 .9-2.7l1.1-.7V11H9Z" fill="currentColor"/></svg>
        </span>
      </div>
    </div>
    <div class="play-backdrop" aria-hidden="true">
      <div class="play-grid"></div>
      <img class="play-bg-art" src="./assets/play-bg.svg?v=2" alt="" />
    </div>

    <header class="top-bar" aria-label="Game status">
      <button class="icon-btn" data-menu type="button" aria-label="Back to menu">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
      </button>

      <div class="stat-chip stat-chip--streak">
        <span class="trophy-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" fill="#f5b942"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3M10 16h4v2H10zM9 20h6" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <div class="stat-chip__body">
          <small>Run ★</small>
          <strong data-streak>0</strong>
          <div class="streak-segs" aria-hidden="true">
            <i data-streak-seg></i><i data-streak-seg></i><i data-streak-seg></i>
          </div>
        </div>
      </div>

      <div class="stat-chip stat-chip--timer" data-timer-chip aria-label="Puzzle timer">
        <span class="timer-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 9v4l2.5 1.5M9 3.5h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
        <div class="stat-chip__body">
          <small>Timer</small>
          <strong data-timer aria-live="polite">1:30</strong>
        </div>
      </div>

      <div class="level-pill" aria-label="Current level">
        <strong data-level>LEVEL 1</strong>
        <div class="level-track" data-level-track></div>
      </div>

      <div class="stat-chip stat-chip--coins">
        <span class="coin-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5b942"/><circle cx="12" cy="12" r="6.2" fill="none" stroke="#fde68a" stroke-width="1.6"/><text x="12" y="15.5" text-anchor="middle" font-size="9" font-weight="800" fill="#92400e">$</text></svg>
        </span>
        <strong data-coins>0</strong>
        <span class="coin-plus" aria-hidden="true">+</span>
      </div>

      <button class="icon-btn" data-mute type="button" aria-label="Mute sound">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.2 13a7.2 7.2 0 0 0 .1-2l1.9-1.1-1.9-3.3-2.2.6a7 7 0 0 0-1.6-.9L15 4.2H9l-.5 2.1a7 7 0 0 0-1.6.9l-2.2-.6-1.9 3.3 1.9 1.1a7.2 7.2 0 0 0 0 2l-1.9 1.1 1.9 3.3 2.2-.6a7 7 0 0 0 1.6.9l.5 2.1h6l.5-2.1a7 7 0 0 0 1.6-.9l2.2.6 1.9-3.3-1.9-1.1Z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
      </button>
    </header>

    <div class="play-reserve" data-play-reserve>
      <section class="chase-panel" data-chase aria-label="Timer chase: don't let the shark catch the cat">
        <img class="chase-panel__bg" src="./assets/chase/scene.png?v=belt-v2" alt="" />
        <div class="chase-panel__veil" aria-hidden="true"></div>
        <div class="chase-panel__hud" hidden aria-hidden="true">
          <div class="chase-time">
            <small>Time left</small>
            <strong>1:30</strong>
            <span class="chase-time__track">
              <i class="chase-time__bar" data-chase-bar></i>
            </span>
          </div>
        </div>
        <div class="chase-stage" aria-hidden="true">
          <div class="chase-cat" data-chase-cat>
            <span class="chase-cat__bubble" data-chase-bubble aria-hidden="true">Save me!</span>
            <img
              class="chase-cat__frame is-still"
              data-chase-cat-frame
              src="./assets/chase/cat-run-still.png?v=face-right1"
              alt=""
              width="160"
              height="160"
              decoding="async"
            />
          </div>
          <div class="chase-shark-wrap" data-chase-shark-wrap>
            <img
              class="chase-shark"
              data-chase-shark
              src="./assets/chase/shark.png?v=still1"
              alt=""
              width="200"
              height="160"
              decoding="async"
            />
            <i class="chase-shark__tear chase-shark__tear--a" aria-hidden="true"></i>
            <i class="chase-shark__tear chase-shark__tear--b" aria-hidden="true"></i>
            <i class="chase-shark__tear chase-shark__tear--c" aria-hidden="true"></i>
          </div>
        </div>
        <div class="chase-clock" role="timer" aria-label="Time left">
          <span class="chase-clock__label">Time</span>
          <strong class="chase-clock__value" data-chase-timer>1:30</strong>
        </div>
        <div class="chase-rail" data-chase-rail aria-hidden="true">
          <div class="chase-rail__shell">
            <div class="chase-rail__track">
              <i class="chase-rail__safe"></i>
              <i class="chase-rail__danger" data-chase-rail-fill></i>
              <i class="chase-rail__segments"></i>
              <i class="chase-rail__glow" data-chase-rail-glow></i>
            </div>
            <div class="chase-rail__cogs" aria-hidden="true">
              <span class="chase-rail__cog"></span>
              <span class="chase-rail__cog"></span>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="play-dock">
    <main class="math-play" aria-label="Math Rescue puzzle board">
      <section class="board-stage" aria-label="Target and cards">
        <div class="orbit-ring" aria-hidden="true">
          <i class="orbit-dot orbit-dot--nw"></i>
          <i class="orbit-dot orbit-dot--ne"></i>
          <i class="orbit-dot orbit-dot--sw"></i>
          <i class="orbit-dot orbit-dot--se"></i>
        </div>
        <div class="card-cross" data-numbers aria-label="Four number cards and center target"></div>
      </section>

      <section class="equation-panel" aria-label="Equation builder">
        <div class="equation-panel__head">
          <span class="equation-panel__title">
            <i class="sigma-badge" aria-hidden="true">Σ</i>
            <span>Equation</span>
          </span>
        </div>
        <div class="equation-field">
          <div data-input class="equation-input" data-empty="true" role="textbox" aria-readonly="true" aria-label="Your equation"></div>
        </div>
        <p class="equation-tip" data-equation-hint></p>
        <section class="correction-panel" data-correction hidden aria-live="polite"></section>
      </section>

      <section class="feedback-line" aria-live="polite">
        <strong data-feedback data-kind="neutral">Use cards without repeating them to match the target.</strong>
        <small data-feedback-detail hidden></small>
      </section>
    </main>

    <footer class="control-deck" aria-label="Equation controls">
      <div class="operator-grid" data-operators></div>
      <div class="action-row">
        <button class="btn-clear" data-clear type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8h8l-.7 11.2a1.5 1.5 0 0 1-1.5 1.4H10.2a1.5 1.5 0 0 1-1.5-1.4L8 8Zm-1.5-.8h11M10 5.5h4" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>
          Clear
        </button>
        <button class="btn-submit" data-submit type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11.5 20 4l-4.8 16.5-3.2-6.2L4 11.5Z" fill="currentColor"/></svg>
          Submit
        </button>
        <button class="btn-hint" data-hint type="button">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18h6M10 21h4M8.5 14.5c-1.8-1.2-3-3.2-3-5.4A6.5 6.5 0 0 1 18.5 9c0 2.2-1.2 4.2-3 5.4L15 17H9l-.5-2.5Z" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span data-hint-label>Hint</span>
        </button>
      </div>
    </footer>
    </div>

    <aside class="play-footer" aria-label="Player status">
      <div class="mascot" aria-hidden="true">
        <img src="./assets/mascot.png?v=2" alt="" width="88" height="88" />
      </div>
      <div class="welcome-card">
        <strong data-welcome>Welcome to Math Rescue.</strong>
        <small data-board-meta>Level 1</small>
        <button class="player-chip" data-player type="button" hidden>Player</button>
      </div>
      <div class="best-card">
        <span class="trophy-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" fill="#f5b942"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3M10 16h4v2H10zM9 20h6" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round"/></svg>
        </span>
        <div>
          <small>Best score</small>
          <strong data-best-score>0</strong>
        </div>
      </div>
    </aside>
    </div>

    <div class="nickname-overlay screen-overlay" data-nickname-overlay>
      <div class="screen-card nickname-card">
        <div class="start-hero">
          <img class="nickname-mascot" src="./assets/chase/cat-run-still.png?v=face-right1" alt="" width="72" height="72" />
          <p class="brand-mark">Math Rescue</p>
          <h1>Pick your rescue name</h1>
          <p class="start-lead">3–8 characters. Letters, numbers, spaces, _ and - only.</p>
        </div>
        <label class="profile-entry">
          <span>Rescue name</span>
          <input data-username type="text" inputmode="text" autocomplete="nickname" maxlength="8" placeholder="e.g. MathCat" aria-label="Rescue name for saving progress" />
        </label>
        <p class="start-status-chip" data-nickname-status hidden></p>
        <p class="nickname-error" data-nickname-error hidden></p>
        <button class="screen-btn screen-btn--primary" data-nickname-continue type="button" disabled>Continue</button>
        <p class="start-save-hint">Your name is checked against the global league.</p>
      </div>
    </div>

    <div class="result-overlay screen-overlay" data-results hidden>
      <section class="result-card" aria-label="Final result">
        <span class="result-kicker">Level complete</span>
        <strong data-result-score>0</strong>
        <p class="result-stars" data-result-stars>★ 0</p>
        <h2 data-result-rank>Practice Explorer</h2>
        <p data-result-message>Try another run.</p>
        <small data-result-best>Best 0</small>
        <button data-new-game type="button">Continue</button>
      </section>
    </div>

    <div class="daily-result screen-overlay" data-daily-result hidden>
      <section class="daily-result-card screen-card" aria-label="Daily Challenge result">
        <span class="daily-result__kicker" data-daily-result-kicker>Challenge complete</span>
        <strong class="daily-result__score" data-daily-result-score>+5</strong>
        <p class="daily-result__stars" data-daily-result-stars>★★★</p>
        <p class="daily-result__meta" data-daily-result-meta>+5 career pts · Total 40</p>
        <p class="daily-result__reset" data-daily-result-reset>Next challenge in 6h</p>
        <div class="daily-result__actions">
          <button class="screen-btn screen-btn--primary" data-daily-share type="button">Share result</button>
          <button class="screen-btn" data-daily-open-ranks type="button">View league</button>
          <button class="screen-btn screen-btn--ghost" data-daily-continue type="button">Back to menu</button>
        </div>
      </section>
    </div>
  `;
}

function updateChase(els, state, catRun, celebrate) {
  if (!els.chasePanel) return;

  const limit = Math.max(1, Number(state.timerLimit) || 90);
  const seconds = Math.max(0, Number(state.timeLeft) || 0);
  const pose = state.chasePose || "idle";
  const idle =
    Boolean(state.awaitingStart) ||
    Boolean(state.showTutorial) ||
    ["nickname", "loading", "menu"].includes(state.phase);
  const catching = pose === "caught" || pose === "ate" || Boolean(state.timerExpired);
  const running =
    state.phase === "playing" && !state.awaitingStart && !state.showTutorial && !catching;

  els.chasePanel.classList.toggle("is-idle", idle || pose === "idle");
  els.chasePanel.classList.toggle("is-running", running && pose === "running");
  els.chasePanel.classList.toggle(
    "is-urgent",
    running && (seconds <= 8 || (limit > 0 && 1 - seconds / limit >= 0.75))
  );
  els.chasePanel.classList.toggle("is-caught", pose === "caught");
  els.chasePanel.classList.toggle("is-ate", pose === "ate" || (state.timerExpired && state.phase === "review"));
  els.chasePanel.classList.toggle("is-safe", pose === "safe");

  if (celebrate) {
    if (pose === "safe" && celebrate.lastPose !== "safe") {
      if (typeof celebrate.stop === "function") celebrate.stop();
      celebrate.stop = burstConfetti(els.chasePanel, { count: 80, durationMs: 2800 });
    }
    celebrate.lastPose = pose;
  }

  if (!catRun) return;

  if (pose === "ate" || (state.timerExpired && state.phase === "review")) {
    catRun.sync({ pose: "ate", limit, timeLeft: 0, deadline: state.timerDeadline });
    return;
  }
  if (pose === "caught" || catching) {
    catRun.sync({ pose: "caught", limit, timeLeft: 0, deadline: state.timerDeadline });
    return;
  }
  if (pose === "safe") {
    catRun.sync({ pose: "safe", limit, timeLeft: seconds, idle: false });
    return;
  }
  if (idle || pose === "idle") {
    catRun.sync({ pose: "idle", limit, timeLeft: seconds, idle: true });
    return;
  }
  if (running) {
    catRun.sync({
      pose: seconds <= 8 ? "urgent" : "running",
      limit,
      timeLeft: seconds,
      deadline: state.timerDeadline,
    });
  }
}

function updateTimerChip(els, state) {
  if (!els.timerChip || !els.timerValue) return;
  const playing = state.phase === "playing";
  els.timerChip.hidden = !playing;
  const seconds = Math.max(0, Number(state.timeLeft) || 0);
  els.timerValue.textContent = formatClock(seconds);
  const active = playing && !state.awaitingStart && !state.showTutorial;
  els.timerValue.setAttribute("aria-live", seconds <= 5 && active ? "assertive" : "polite");
  els.timerChip.classList.toggle("is-warn", active && seconds <= 10 && seconds > 5);
  els.timerChip.classList.toggle("is-urgent", active && seconds <= 5);
  els.timerChip.classList.toggle("is-paused", playing && (Boolean(state.awaitingStart) || Boolean(state.showTutorial)));
}

function formatClock(totalSeconds) {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function renderLevelTrack(track, state) {
  track.replaceChildren();
  const steps = 3;
  const progress = levelStarPace(state.runStars || 0);
  for (let i = 1; i <= steps; i += 1) {
    if (i > 1) {
      const line = document.createElement("i");
      line.className = `level-line${i <= progress ? " is-on" : ""}`;
      track.append(line);
    }
    const dot = document.createElement("span");
    dot.className = `level-dot${i <= progress ? " is-on" : ""}${i === progress ? " is-current" : ""}`;
    track.append(dot);
  }
}

function buildOperatorPad(container, onAppend, onBackspace) {
  for (const op of OPERATORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "operator-button";
    button.textContent = op.label;
    button.setAttribute("aria-label", `Add ${op.label}`);
    button.addEventListener("click", () => onAppend(op.value));
    container.append(button);
  }

  const backspace = document.createElement("button");
  backspace.type = "button";
  backspace.className = "operator-button operator-button--back";
  backspace.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h9a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-9l-6-6 6-6Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="m13 10 4 4m0-4-4 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  backspace.setAttribute("aria-label", "Backspace");
  backspace.addEventListener("click", onBackspace);
  container.append(backspace);
}

function renderCards(container, state, onAppend, onPuzzleGo) {
  container.replaceChildren();
  const availability = countByKey(state.round.cards);
  const locked = state.phase !== "playing" || state.awaitingStart;

  for (let i = 0; i < state.round.cards.length; i += 1) {
    const card = state.round.cards[i];
    const theme = CARD_THEMES[i] || CARD_THEMES[0];
    const used = state.usedCounts.get(card.key) || 0;
    const max = availability.get(card.key) || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-card number-card--${theme.position} number-card--${theme.tone}`;
    button.disabled = locked || used >= max;
    button.setAttribute("aria-label", `Use number card ${card.label}`);
    button.innerHTML = `
      <span class="number-card__badge" aria-hidden="true">${cardIcon(theme.icon)}</span>
      <span class="number-card__glow" aria-hidden="true"></span>
    `;
    button.append(renderCardValue(card));
    button.addEventListener("click", () => onAppend(card.input));
    container.append(button);
  }

  if (state.phase === "playing" && state.awaitingStart) {
    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "target-badge target-badge--start";
    startBtn.setAttribute("aria-label", "Start puzzle and reveal target");
    startBtn.disabled = false;
    startBtn.innerHTML = `
      <span class="target-badge__label">Ready</span>
      <strong class="target-badge__value target-badge__value--start">Start</strong>
    `;
    startBtn.addEventListener("click", () => onPuzzleGo?.());
    container.append(startBtn);
    return;
  }

  const target = document.createElement("div");
  target.className = "target-badge";
  if (state.feedback.kind === "good") target.classList.add("target-badge--pulse");
  target.setAttribute(
    "aria-label",
    `Target number ${state.round.targetLabel || state.round.target}`
  );
  target.innerHTML = `
    <span class="target-badge__label">Target</span>
    <strong class="target-badge__value">${state.round.targetLabel || state.round.target}</strong>
  `;
  container.append(target);
}

function cardIcon(kind) {
  if (kind === "chart") {
    return `<svg viewBox="0 0 24 24"><path d="M5 19V10m7 9V5m7 14v-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  }
  if (kind === "abacus") {
    return `<svg viewBox="0 0 24 24"><path d="M5 6h14M5 12h14M5 18h14M8 4v16M16 4v16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  }
  if (kind === "ruler") {
    return `<svg viewBox="0 0 24 24"><path d="M4 16 16 4l4 4L8 20 4 16Zm4-1 1-1m2-2 1-1m2-2 1-1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  return `<svg viewBox="0 0 24 24"><rect x="4" y="3" width="16" height="18" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 8h8M8 12h8M8 16h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
}

function updateControls(els, state) {
  const playing = state.phase === "playing" && !state.awaitingStart;
  const review = state.phase === "review";
  els.clearButton.disabled = !playing;
  els.submitButton.disabled = !playing;
  els.hintButton.disabled =
    review
      ? false
      : !playing || Boolean(state.usedNudge);
  els.hintLabel.textContent = state.hintLabel || (review ? "Next" : "Hint");

  for (const button of els.operatorPad.querySelectorAll("button")) {
    button.disabled = !playing;
  }
}

function updateMenuScreen(els, state) {
  const show = state.phase === "menu";
  if (!els.menuScreen) return;
  els.menuScreen.hidden = !show;
  if (!show) return;

  const level = Math.max(1, Number(state.unlockedBoard) || 1);
  if (els.menuLevel) els.menuLevel.textContent = String(level);
  if (els.menuCoins) els.menuCoins.textContent = String(state.bestScore || 0);
  if (els.menuPlayLevel) {
    els.menuPlayLevel.textContent = state.canResume
      ? `LEVEL ${resumeLevelFromSave(state.resume)}`
      : `LEVEL ${level}`;
  }
  if (els.menuPlayTitle) {
    els.menuPlayTitle.textContent = state.canResume ? "CONTINUE" : "PLAY";
  }
  if (els.menuPlay) {
    els.menuPlay.setAttribute(
      "aria-label",
      state.canResume ? "Continue your level" : `Play level ${level}`
    );
  }

  if (els.menuMute) {
    els.menuMute.classList.toggle("is-muted", !state.soundOn);
    els.menuMute.setAttribute("aria-label", state.soundOn ? "Turn sound off" : "Turn sound on");
  }
  if (els.menuMuteLabel) {
    els.menuMuteLabel.textContent = state.soundOn ? "On" : "Off";
  }
  if (els.menuSettingsPlayer) {
    els.menuSettingsPlayer.textContent = state.username || "Player";
  }
  if (els.menuSettingsSync) {
    const syncLabels = {
      idle: "Cloud sync — not signed in yet",
      ok: "Cloud sync — saved online",
      offline: "Cloud sync — offline (playing locally)",
    };
    els.menuSettingsSync.textContent =
      syncLabels[state.syncStatus] || syncLabels.idle;
  }
  if (els.menuGreeting) {
    if (state.username) {
      els.menuGreeting.hidden = false;
      els.menuGreeting.textContent = `Hey, ${state.username} — ready to rescue?`;
    } else {
      els.menuGreeting.hidden = true;
      els.menuGreeting.textContent = "";
    }
  }
  if (els.menuDailyStatus) {
    if (state.dailyCompletedToday) {
      const resetIn = formatDailyCountdown(msUntilNextDaily());
      els.menuDailyStatus.textContent = state.dailyTodayResult
        ? `Done · resets in ${resetIn}`
        : `Locked · resets in ${resetIn}`;
    } else {
      els.menuDailyStatus.textContent = "Play today";
    }
  }
  const dailyFeature = els.menuScreen?.querySelector(".menu-feature--daily");
  if (dailyFeature) {
    dailyFeature.classList.toggle("is-complete", Boolean(state.dailyCompletedToday));
  }
  if (els.menuDaily) {
    els.menuDaily.hidden = !state.menuDailyOpen;
  }
  if (els.menuSettings) {
    els.menuSettings.hidden = !state.menuSettingsOpen;
  }
  if (els.menuHowTo) {
    els.menuHowTo.hidden = !state.menuHowToOpen;
  }
  if (els.menuJourney) {
    els.menuJourney.hidden = !state.menuJourneyOpen;
  }
  if (els.menuLeaderboard) {
    els.menuLeaderboard.hidden = !state.menuLeaderboardOpen;
  }
  renderMenuPath(els.menuPath, state);
  renderJourneyMap(els, state);
  if (els.menuToast) {
    const toast = state.menuToast || "";
    els.menuToast.hidden = !toast;
    els.menuToast.textContent = toast || "Coming soon";
  }

  renderMenuPlayers(els.menuPlayers, state.leaderboard || [], state.usernameKey);
}

function renderMenuPlayers(container, list, usernameKey = "") {
  if (!container) return;
  container.replaceChildren();
  const players = (list || []).filter((entry) => (entry.bestScore || 0) > 0).slice(0, 3);
  if (players.length === 0) {
    const empty = document.createElement("div");
    empty.className = "menu-players__empty";
    empty.innerHTML = `
      <img src="./assets/chase/cat-run-still.png?v=face-right1" alt="" width="48" height="48" />
      <p>Be the first rescuer.</p>
      <small>Clear a level to join the league.</small>
    `;
    container.append(empty);
    return;
  }
  players.forEach((entry) => {
    const row = createLeagueRow(entry);
    row.classList.add("league-row--menu");
    container.append(row);
  });
}

function playerInitials(name) {
  const parts = String(name || "P").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "P";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function updateNicknameOverlay(els, state) {
  const show = state.phase === "nickname" || state.phase === "loading";
  els.nicknameOverlay.hidden = !show;
  if (!show) {
    if (els.usernameInput) delete els.usernameInput.dataset.focused;
    return;
  }
  const canContinue = Boolean(state.nicknameValid) && !state.nicknamePending;
  els.nicknameContinue.disabled = !canContinue;
  els.nicknameContinue.textContent = state.nicknamePending ? "Saving…" : "Continue";
  if (els.nicknameError) {
    const error = state.nicknameError || "";
    els.nicknameError.hidden = !error;
    els.nicknameError.textContent = error;
  }
  if (els.nicknameStatus) {
    if (state.usernameKey && state.nicknameValid && !state.nicknameError) {
      els.nicknameStatus.hidden = false;
      els.nicknameStatus.textContent = `Level ${state.unlockedBoard} unlocked · Score ${state.bestScore}`;
    } else {
      els.nicknameStatus.hidden = true;
      els.nicknameStatus.textContent = "";
    }
  }
  if (state.phase === "nickname" && els.usernameInput && !els.usernameInput.dataset.focused) {
    els.usernameInput.dataset.focused = "1";
    window.setTimeout(() => els.usernameInput.focus(), 40);
  }
}

function leagueAvatarColor(name) {
  const palette = ["#2563eb", "#7c3aed", "#db2777", "#ea580c", "#059669", "#0891b2", "#4f46e5", "#c026d3"];
  let hash = 0;
  for (let i = 0; i < String(name || "").length; i += 1) {
    hash = (hash * 31 + String(name).charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function leagueRankMedal(rank) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return String(rank);
}

function createLeaguePodiumSlot(entry, place) {
  const slot = document.createElement("article");
  const isYou = entry.isCurrentPlayer;
  const color = leagueAvatarColor(entry.name);
  slot.className = `league-podium__slot league-podium__slot--${place}`;
  if (isYou) slot.classList.add("is-you");
  slot.innerHTML = `
    <span class="league-podium__medal" aria-hidden="true">${leagueRankMedal(place)}</span>
    <span class="league-podium__avatar" style="--avatar-color:${color}">${escapeHtml(playerInitials(entry.name))}</span>
    <strong class="league-podium__name">${escapeHtml(entry.name || "Player")}</strong>
    ${isYou ? '<span class="league-row__tag">YOU</span>' : ""}
    <span class="league-podium__score">
      <span class="league-row__score-val">${Number(entry.bestScore || 0).toLocaleString()}</span>
      <span class="league-row__score-ico" aria-hidden="true">🏆</span>
    </span>
    <span class="league-podium__pedestal" aria-hidden="true"></span>
  `;
  return slot;
}

function createLeaguePodium(entries) {
  const podium = document.createElement("div");
  podium.className = "league-podium";
  podium.setAttribute("aria-label", "Top three players");
  const byRank = new Map(entries.map((entry) => [Number(entry.rank), entry]));
  const second = byRank.get(2);
  const first = byRank.get(1);
  const third = byRank.get(3);
  if (second) podium.append(createLeaguePodiumSlot(second, 2));
  if (first) podium.append(createLeaguePodiumSlot(first, 1));
  if (third) podium.append(createLeaguePodiumSlot(third, 3));
  if (!second && !third && first) podium.classList.add("league-podium--solo");
  return podium;
}

function updateDailyModal(els, state) {
  if (!els.menuDaily) return;
  const dateKey = state.dailyDateKey || "";
  const config = getDailyConfig(dateKey);
  const puzzleNum = els.menuDaily.querySelector("[data-daily-puzzle-num]");
  const flavor = els.menuDaily.querySelector("[data-daily-flavor]");
  const startBtn = els.menuDaily.querySelector("[data-menu-start-daily]");
  if (puzzleNum) puzzleNum.textContent = `#${dailyPuzzleNumber(dateKey)}`;
  if (flavor) flavor.textContent = config.label || "Today's challenge";
  if (startBtn) {
    const lockedWithoutResult = state.dailyCompletedToday && !state.dailyTodayResult;
    startBtn.disabled = lockedWithoutResult;
    if (state.dailyCompletedToday) {
      startBtn.textContent = state.dailyTodayResult
        ? "View today's result"
        : `Locked · ${formatDailyCountdown(msUntilNextDaily())}`;
    } else {
      startBtn.textContent = "Play today's challenge";
    }
  }
}

function updateDailyResult(els, state) {
  if (!els.dailyResultOverlay) return;
  const show = state.phase === "daily_finished" && state.dailyResult;
  els.dailyResultOverlay.hidden = !show;
  if (!show) return;
  const result = state.dailyResult;
  const kickerEl = els.dailyResultOverlay.querySelector("[data-daily-result-kicker]");
  const scoreEl = els.dailyResultOverlay.querySelector("[data-daily-result-score]");
  const starsEl = els.dailyResultOverlay.querySelector("[data-daily-result-stars]");
  const metaEl = els.dailyResultOverlay.querySelector("[data-daily-result-meta]");
  const resetEl = els.dailyResultOverlay.querySelector("[data-daily-result-reset]");
  const succeeded = Boolean(result.succeeded);
  if (kickerEl) {
    kickerEl.textContent = succeeded ? "Challenge complete" : "Challenge over";
  }
  if (scoreEl) {
    scoreEl.textContent = succeeded ? `+${result.careerBonus || 5}` : "+0";
  }
  if (starsEl) {
    const stars = Math.max(1, Math.min(3, Number(result.stars) || 1));
    starsEl.textContent = `${"★".repeat(stars)}${"☆".repeat(3 - stars)}`;
  }
  if (metaEl) {
    const bits = [
      succeeded ? `+${result.careerBonus || 0} career pts` : "No bonus",
      `Total score ${result.totalScore ?? ""}`.trim(),
      `${result.timeSeconds || 0}s`,
    ].filter(Boolean);
    metaEl.textContent = bits.join(" · ");
  }
  if (resetEl) {
    resetEl.textContent = `Next challenge in ${result.resetsIn || formatDailyCountdown()}`;
  }
}

function updateLeaderboardOverlay(els, state) {
  if (!els.menuLeaderboardList) return;

  els.menuLeaderboardList.replaceChildren();

  const entries = (state.leaderboard || []).filter((entry) => (entry.bestScore || 0) > 0);
  const topThree = entries.filter((entry) => {
    const rank = Number(entry.rank);
    return rank >= 1 && rank <= 3;
  });
  const rest = entries.filter((entry) => Number(entry.rank) > 3);

  if (els.menuLeaderboardPodium) {
    els.menuLeaderboardPodium.replaceChildren();
    if (topThree.length > 0) {
      els.menuLeaderboardPodium.append(createLeaguePodium(topThree));
      els.menuLeaderboardPodium.hidden = false;
    } else {
      els.menuLeaderboardPodium.hidden = true;
    }
  }

  if (entries.length === 0) {
    const empty = document.createElement("div");
    empty.className = "league-panel__empty";
    empty.innerHTML = `
      <span class="league-panel__empty-icon" aria-hidden="true">🏅</span>
      <p>No scores yet</p>
      <small>Clear a level to join the league.</small>
    `;
    els.menuLeaderboardList.append(empty);
  } else {
    for (const entry of rest) {
      els.menuLeaderboardList.append(createLeagueRow(entry));
    }
    if (state.playerRank && !entries.some((entry) => entry.isCurrentPlayer)) {
      const divider = document.createElement("div");
      divider.className = "league-panel__divider";
      divider.textContent = "Your rank";
      els.menuLeaderboardList.append(divider, createLeagueRow(state.playerRank, true));
    }
  }

  const columns = els.menuLeaderboard?.querySelector("[data-menu-leaderboard-columns]");
  const showPlayerOutside = state.playerRank && !entries.some((entry) => entry.isCurrentPlayer);
  const showTable = entries.length === 0 || rest.length > 0 || showPlayerOutside;
  const table = els.menuLeaderboard?.querySelector(".league-panel__table");
  if (table) table.hidden = !showTable;
  if (columns) {
    const spans = columns.querySelectorAll("span");
    if (spans[2]) spans[2].textContent = "Score";
    columns.hidden = rest.length === 0;
  }

  if (els.menuLeaderboardRank) {
    const valueEl = els.menuLeaderboardRank.querySelector(".league-panel__you-value");
    let rank = state.playerRank?.rank;
    if (!rank && entries.some((entry) => entry.isCurrentPlayer)) {
      rank = entries.find((entry) => entry.isCurrentPlayer)?.rank;
    }
    if (rank) {
      els.menuLeaderboardRank.hidden = false;
      if (valueEl) valueEl.textContent = `#${rank}`;
    } else {
      els.menuLeaderboardRank.hidden = true;
      if (valueEl) valueEl.textContent = "";
    }
  }
}

function createLeagueRow(entry, highlight = false) {
  const row = document.createElement("article");
  const rank = Number(entry.rank) || 0;
  const isYou = highlight || entry.isCurrentPlayer;
  const color = leagueAvatarColor(entry.name);
  row.className = "league-row";
  if (isYou) row.classList.add("is-you");
  if (rank === 1) row.classList.add("is-gold");
  if (rank === 2) row.classList.add("is-silver");
  if (rank === 3) row.classList.add("is-bronze");

  row.innerHTML = `
    <span class="league-row__medal" aria-label="Rank ${rank}">${leagueRankMedal(rank)}</span>
    <span class="league-row__player">
      <span class="league-row__avatar" style="--avatar-color:${color}">${escapeHtml(playerInitials(entry.name))}</span>
      <span class="league-row__name-wrap">
        <strong class="league-row__name">${escapeHtml(entry.name || "Player")}</strong>
        ${isYou ? '<span class="league-row__tag">YOU</span>' : ""}
      </span>
    </span>
    <span class="league-row__score">
      <span class="league-row__score-val">${Number(entry.bestScore || 0).toLocaleString()}</span>
      <span class="league-row__score-ico" aria-hidden="true">🏆</span>
    </span>
  `;
  return row;
}

function updateResults(els, state) {
  const show = state.phase === "finished" && state.result;
  els.resultsOverlay.hidden = !show;
  if (!show) return;
  els.resultScore.textContent = String(state.score);
  const levelStars = state.taskStarsEarned || state.runStars || 1;
  els.resultStars.textContent = `★ ${levelStars} this level`;
  els.resultRank.textContent = state.result.title;
  els.resultMessage.textContent = `${state.result.message} Level ${state.unlockedBoard} is now unlocked.`;
  els.resultBest.textContent = `Total score ${state.bestScore} · Best ★ ${state.bestStars}`;
}

function updateCoachTip(els, state) {
  const show = Boolean(state.showTutorial && state.tutorialStep >= 1);
  if (els.coachTip) els.coachTip.hidden = !show;
  if (!show) {
    coachLayoutState = null;
    if (els.coachPointer) els.coachPointer.hidden = true;
    return;
  }
  const copy = TUTORIAL_COPY[state.tutorialStep] || TUTORIAL_COPY[1];
  if (els.coachStep) els.coachStep.textContent = copy.title;
  if (els.coachBody) els.coachBody.textContent = copy.body;
  if (els.coachSkip) {
    const isLastStep = state.tutorialStep === TUTORIAL_LAST_STEP;
    els.coachSkip.textContent = isLastStep ? "Done" : "Skip tutorial";
    els.coachSkip.classList.toggle("coach-tip__skip--done", isLastStep);
    els.coachSkip.setAttribute("aria-label", isLastStep ? "Finish tutorial" : "Skip tutorial");
  }
  if (els.coachTip) {
    els.coachTip.classList.toggle("coach-tip--last", state.tutorialStep === TUTORIAL_LAST_STEP);
  }
  coachLayoutState = state;
  layoutCoachPointer(els, state);
}

const TUTORIAL_TARGETS = {
  1: ".target-badge--start",
  2: ".number-card--left",
  3: ".operator-grid",
  4: "[data-submit]",
};

let coachLayoutState = null;

function rectCenter(rect, origin) {
  return {
    x: rect.left + rect.width / 2 - origin.left,
    y: rect.top + rect.height / 2 - origin.top,
  };
}

function anchorOnRect(rect, origin, toward) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const dx = toward.x + origin.left - cx;
  const dy = toward.y + origin.top - cy;
  if (!dx && !dy) {
    return { x: cx - origin.left, y: cy - origin.top };
  }
  const scale = Math.min(rect.width / 2 / Math.abs(dx), rect.height / 2 / Math.abs(dy));
  return {
    x: cx - origin.left + dx * scale,
    y: cy - origin.top + dy * scale,
  };
}

function layoutCoachPointer(els, state) {
  const pointer = els.coachPointer;
  if (!pointer || !state.showTutorial || state.tutorialStep < 1) {
    if (pointer) {
      pointer.hidden = true;
      pointer.classList.remove("coach-pointer--dismiss");
    }
    return;
  }

  if (state.tutorialStep === TUTORIAL_LAST_STEP) {
    pointer.hidden = false;
    pointer.classList.add("coach-pointer--dismiss");
    if (els.coachPath) els.coachPath.setAttribute("d", "");
    if (els.coachTap) els.coachTap.hidden = true;
    return;
  }

  pointer.classList.remove("coach-pointer--dismiss");
  if (els.coachTap) els.coachTap.hidden = false;

  window.requestAnimationFrame(() => {
    const playShell = els.playShell;
    const selector = TUTORIAL_TARGETS[state.tutorialStep];
    let target = playShell?.querySelector(selector);
    if (!target && state.tutorialStep === 2) {
      target = playShell?.querySelector(".number-card");
    }
    const bubble = els.coachTip?.querySelector(".coach-tip__bubble");
    if (!playShell || !target || !bubble || els.coachTip?.hidden) {
      pointer.hidden = true;
      return;
    }

    const shellRect = playShell.getBoundingClientRect();
    if (!shellRect.width || !shellRect.height) {
      pointer.hidden = true;
      return;
    }

    const targetRect = target.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    if (!targetRect.width || !targetRect.height || !bubbleRect.width || !bubbleRect.height) {
      pointer.hidden = true;
      return;
    }
    const targetCenter = rectCenter(targetRect, shellRect);
    const bubbleCenter = rectCenter(bubbleRect, shellRect);
    const start = anchorOnRect(bubbleRect, shellRect, targetCenter);
    const end = anchorOnRect(targetRect, shellRect, bubbleCenter);

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const distance = Math.hypot(dx, dy) || 1;
    const curve = Math.min(72, distance * 0.28);
    const nx = -dy / distance;
    const ny = dx / distance;
    const midX = (start.x + end.x) / 2 + nx * curve;
    const midY = (start.y + end.y) / 2 + ny * curve;

    const svg = els.coachSvg;
    const path = els.coachPath;
    if (svg && path) {
      svg.setAttribute("viewBox", `0 0 ${shellRect.width} ${shellRect.height}`);
      path.setAttribute(
        "d",
        `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${midX.toFixed(1)} ${midY.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
      );
    }

    if (els.coachTap) {
      els.coachTap.style.left = `${targetCenter.x}px`;
      els.coachTap.style.top = `${targetCenter.y}px`;
    }

    if (els.coachTip) {
      const pointerDir = bubbleCenter.y > targetCenter.y ? "up" : "down";
      els.coachTip.dataset.pointer = pointerDir;
    }

    pointer.hidden = false;
  });
}

function renderCorrection(panel, correction) {
  panel.replaceChildren();
  panel.hidden = !correction;
  if (!correction) return;

  const title = document.createElement("strong");
  title.textContent = correction.title;

  const attempt = document.createElement("p");
  attempt.append("Your try: ");
  const attemptCode = document.createElement("code");
  attemptCode.textContent = correction.attempted;
  attempt.append(attemptCode);

  const detail = document.createElement("small");
  detail.textContent = correction.result;

  const solutions = correction.solutions || (correction.solution ? [correction.solution] : []);
  const solutionNodes = solutions.map((solution, index) => {
    const line = document.createElement("p");
    line.append(index === 0 ? "Solution: " : "Also: ");
    const code = document.createElement("code");
    code.textContent = `${solution} = ${correction.target}`;
    line.append(code);
    return line;
  });

  panel.append(title, attempt, detail, ...solutionNodes);
}

function renderCardValue(card) {
  const span = document.createElement("span");
  span.className =
    card.denominator === 1 ? "card-value" : "card-value card-value--fraction";
  if (card.denominator === 1) {
    span.textContent = card.label;
  } else {
    span.innerHTML = `<span>${card.numerator}</span><i></i><span>${card.denominator}</span>`;
  }
  return span;
}

function countByKey(cards) {
  const map = new Map();
  for (const card of cards) {
    map.set(card.key, (map.get(card.key) || 0) + 1);
  }
  return map;
}

const JOURNEY_WORLDS = [
  { name: "Sandy Shore", blurb: "Warm-up levels" },
  { name: "River Bend", blurb: "The chase speeds up" },
  { name: "Storm Bay", blurb: "Trickier targets" },
  { name: "Deep Current", blurb: "Sharper equations" },
  { name: "Shark Tide", blurb: "Expert rescue" },
  { name: "Coral Peak", blurb: "Legendary levels" },
];

function journeyLevelCount(unlockedBoard) {
  const unlocked = Math.max(1, Number(unlockedBoard) || 1);
  return Math.max(20, Math.ceil((unlocked + 8) / 5) * 5);
}

function journeyWorld(board) {
  const index = Math.floor((Math.max(1, board) - 1) / 5);
  const base = JOURNEY_WORLDS[index % JOURNEY_WORLDS.length];
  const cycle = Math.floor(index / JOURNEY_WORLDS.length);
  return {
    name: cycle ? `${base.name} ${cycle + 1}` : base.name,
    blurb: base.blurb,
    start: index * 5 + 1,
  };
}

function resumeLevelFromSave(resume) {
  const level = Number(resume?.levelIndex ?? resume?.boardIndex);
  return Number.isFinite(level) ? Math.max(1, level) : 1;
}

function boardStatus(board, unlocked, stars) {
  if (board < unlocked) return "done";
  if (board === unlocked) return "current";
  return "locked";
}

function renderMenuPath(container, state) {
  if (!container) return;
  const unlocked = Math.max(1, Number(state.unlockedBoard) || 1);
  const start = Math.max(1, unlocked - 2);
  const end = start + 4;
  const starsMap = state.boardStars || {};
  container.replaceChildren();
  for (let board = start; board <= end; board += 1) {
    container.append(makeJourneyNode(board, unlocked, starsMap, { compact: true }));
  }
}

function renderJourneyMap(els, state) {
  const overlay = els.menuJourney;
  const mount = els.menuJourneyMount;
  if (!overlay || !mount) return;
  const unlocked = Math.max(1, Number(state.unlockedBoard) || 1);
  const hud = overlay.querySelector("[data-journey-hud-level]");
  if (hud) hud.textContent = String(unlocked);

  if (overlay.hidden) {
    overlay.dataset.scrolled = "";
    return;
  }

  const total = journeyLevelCount(unlocked);
  const starsMap = state.boardStars || {};
  const signature = `${unlocked}:${total}:${JSON.stringify(starsMap)}`;
  if (mount.dataset.signature !== signature) {
    mount.dataset.signature = signature;
    mount.replaceChildren();
    const trail = document.createElement("div");
    trail.className = "journey-map";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "journey-map__path");
    svg.setAttribute("aria-hidden", "true");
    trail.append(svg);

    const worldCount = total / 5;
    for (let worldIndex = 0; worldIndex < worldCount; worldIndex += 1) {
      const start = worldIndex * 5 + 1;
      const world = journeyWorld(start);
      const section = document.createElement("section");
      section.className = "journey-world";
      const head = document.createElement("header");
      head.className = "journey-world__head";
      head.innerHTML = `<p>${escapeHtml(world.blurb)}</p><h3>${escapeHtml(world.name)}</h3>`;
      const row = document.createElement("div");
      row.className = "journey-world__nodes";
      for (let board = start + 4; board >= start; board -= 1) {
        row.append(makeJourneyNode(board, unlocked, starsMap, { compact: false }));
      }
      section.append(head, row);
      trail.append(section);
    }
    mount.append(trail);
    window.requestAnimationFrame(() => drawJourneyPath(trail, unlocked));
  } else {
    window.requestAnimationFrame(() => drawJourneyPath(mount.querySelector(".journey-map"), unlocked));
  }

  if (overlay.dataset.scrolled !== signature) {
    overlay.dataset.scrolled = signature;
    window.requestAnimationFrame(() => {
      const current = mount.querySelector("[data-journey-current]");
      current?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
}

function makeJourneyNode(board, unlocked, starsMap, { compact }) {
  const status = boardStatus(board, unlocked, starsMap);
  const stars = Math.max(0, Math.min(3, Number(starsMap[board]) || Number(starsMap[String(board)]) || 0));
  const button = document.createElement("button");
  button.type = "button";
  button.className = `journey-node journey-node--${status}${compact ? " journey-node--compact" : ""}`;
  button.dataset.selectBoard = String(board);
  if (status === "current") button.dataset.journeyCurrent = "true";
  button.setAttribute(
    "aria-label",
    status === "locked"
      ? `Level ${board} locked`
      : status === "current"
        ? `Play level ${board}`
        : `Replay level ${board}, ${stars} stars`
  );

  const badge = document.createElement("span");
  badge.className = "journey-node__badge";
  if (status === "locked") {
    badge.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="11" width="12" height="9" rx="2" fill="currentColor"/><path d="M8 11V8a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  } else {
    badge.textContent = String(board);
  }

  const starRow = document.createElement("span");
  starRow.className = "journey-node__stars";
  starRow.setAttribute("aria-hidden", "true");
  for (let i = 0; i < 3; i += 1) {
    const star = document.createElement("i");
    if (status !== "locked" && i < (status === "current" ? Math.max(stars, 0) : stars)) {
      star.className = "is-on";
    }
    starRow.append(star);
  }

  button.append(badge, starRow);
  if (status === "current" && !compact) {
    const pin = document.createElement("span");
    pin.className = "journey-node__pin";
    pin.innerHTML = `<img src="./assets/chase/cat-run-still.png?v=face-right1" alt="" />`;
    button.append(pin);
  }
  return button;
}

function drawJourneyPath(map, unlocked) {
  if (!map) return;
  const svg = map.querySelector(".journey-map__path");
  const nodes = [...map.querySelectorAll(".journey-node")].sort(
    (a, b) => Number(a.dataset.selectBoard) - Number(b.dataset.selectBoard)
  );
  if (!svg || nodes.length < 2) return;
  const bounds = map.getBoundingClientRect();
  svg.setAttribute("viewBox", `0 0 ${Math.max(1, bounds.width)} ${Math.max(1, bounds.height)}`);
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  const points = nodes.map((node) => {
    const rect = node.querySelector(".journey-node__badge")?.getBoundingClientRect() || node.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - bounds.left,
      y: rect.top + rect.height / 2 - bounds.top,
      board: Number(node.dataset.selectBoard),
    };
  });
  const d = points
    .map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      const prev = points[index - 1];
      const cx = (prev.x + point.x) / 2;
      return `C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
    })
    .join(" ");
  svg.replaceChildren();
  const doneCount = Math.max(0, unlocked - 1);
  const donePoints = points.slice(0, Math.min(points.length, doneCount + 1));
  const rest = document.createElementNS("http://www.w3.org/2000/svg", "path");
  rest.setAttribute("d", d);
  rest.setAttribute("class", "journey-map__stroke journey-map__stroke--ahead");
  svg.append(rest);
  if (donePoints.length > 1) {
    const done = document.createElementNS("http://www.w3.org/2000/svg", "path");
    done.setAttribute(
      "d",
      donePoints
        .map((point, index) => {
          if (index === 0) return `M ${point.x} ${point.y}`;
          const prev = donePoints[index - 1];
          const cx = (prev.x + point.x) / 2;
          return `C ${cx} ${prev.y}, ${cx} ${point.y}, ${point.x} ${point.y}`;
        })
        .join(" ")
    );
    done.setAttribute("class", "journey-map__stroke journey-map__stroke--done");
    svg.append(done);
  }
}

