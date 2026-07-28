import { createCatRunAnimator } from "./chaseCatRun.js";
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
    title: "Step 1 · Cards",
    body: "Tap the number cards around the target to add them to your equation.",
  },
  2: {
    title: "Step 2 · Operators",
    body: "Use +, −, ×, ÷ and parentheses from the pad below.",
  },
  3: {
    title: "Step 3 · Submit",
    body: "Hit Submit when your equation equals the target. You get free retries!",
  },
};

export function createUI({ mount, handlers }) {
  const shell = document.createElement("section");
  shell.className = "math-game game-surface";
  shell.innerHTML = template();
  mount.replaceChildren(shell);

  const els = {
    shell,
    playShell: shell.querySelector("[data-play-shell]"),
    menuScreen: shell.querySelector("[data-menu-screen]"),
    menuStreak: shell.querySelector("[data-menu-streak]"),
    menuLevel: shell.querySelector("[data-menu-level]"),
    menuCoins: shell.querySelector("[data-menu-coins]"),
    menuPlayLevel: shell.querySelector("[data-menu-play-level]"),
    menuPlayers: shell.querySelector("[data-menu-players]"),
    menuSettings: shell.querySelector("[data-menu-settings]"),
    menuMute: shell.querySelector("[data-menu-mute]"),
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
    resultsOverlay: shell.querySelector("[data-results]"),
    resultScore: shell.querySelector("[data-result-score]"),
    resultStars: shell.querySelector("[data-result-stars]"),
    resultRank: shell.querySelector("[data-result-rank]"),
    resultMessage: shell.querySelector("[data-result-message]"),
    resultBest: shell.querySelector("[data-result-best]"),
    resultBoard: shell.querySelector("[data-result-board]"),
    newGameButton: shell.querySelector("[data-new-game]"),
    tutorial: shell.querySelector("[data-tutorial]"),
    tutorialTitle: shell.querySelector("[data-tutorial-title]"),
    tutorialBody: shell.querySelector("[data-tutorial-body]"),
    tutorialNext: shell.querySelector("[data-tutorial-next]"),
    tutorialSkip: shell.querySelector("[data-tutorial-skip]"),
  };

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
  on(els.tutorialNext, "click", handlers.onTutorialNext);
  on(els.tutorialSkip, "click", handlers.onTutorialSkip);

  for (const btn of shell.querySelectorAll("[data-menu-open-settings]")) {
    on(btn, "click", handlers.onOpenMenuSettings);
  }
  on(shell.querySelector("[data-menu-close-settings]"), "click", handlers.onCloseMenuSettings);
  on(shell.querySelector("[data-menu-play]"), "click", handlers.onPlayFromMenu);
  on(els.menuMute, "click", handlers.onToggleSound);
  on(shell.querySelector("[data-menu-change-name]"), "click", handlers.onChangeName);
  for (const btn of shell.querySelectorAll("[data-coming-soon]")) {
    on(btn, "click", handlers.onComingSoon);
  }

  return {
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
      if (onMenu) return;

      const segsOn = Math.min(4, state.runStars || 0);
      els.streakValue.textContent = String(state.runStars || 0);
      els.streakSegs.forEach((seg, index) => {
        seg.classList.toggle("is-on", index < segsOn);
      });

      els.levelLabel.textContent = `LEVEL ${state.boardIndex}`;
      renderLevelTrack(els.levelTrack, state);

      els.coins.textContent = String(state.score);
      updateTimerChip(els, state);
      updateChase(els, state, catRun, celebrate);
      els.bestScore.textContent = String(state.bestScore);
      els.welcome.textContent = state.usernameKey
        ? `Welcome back, ${state.username}.`
        : "Welcome to Math Rescue.";
      els.boardMeta.textContent = `Board ${state.boardIndex} · Task ${state.taskIndex}/${state.tasksPerBoard}`;

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
      els.equationHint.innerHTML = `<span class="tip-ico" aria-hidden="true">💡</span><span>Use <b>+ − × ÷</b> and <b>( )</b> to make <b>${targetLabel}</b></span>`;

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
      updateTutorial(els, state);
    },

    destroy() {
      if (typeof celebrate.stop === "function") celebrate.stop();
      catRun.destroy();
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
        <div class="menu-screen__grid"></div>
        <img class="menu-screen__doodles" src="./assets/math-doodles.svg" alt="" />
      </div>
      <div class="menu-screen__scroll">
        <header class="menu-hud" aria-label="Menu status">
          <button class="menu-icon-btn" data-menu-open-settings type="button" aria-label="Open menu">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M5 12h14M5 17h14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/></svg>
          </button>
          <div class="menu-chip menu-chip--streak">
            <span class="menu-chip__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M8 4h8v3a4 4 0 0 1-8 0V4Z" fill="#f5b942"/><path d="M7 5H5a2 2 0 0 0 2 3M17 5h2a2 2 0 0 1-2 3M10 16h4v2H10zM9 20h6" fill="none" stroke="#d97706" stroke-width="1.8" stroke-linecap="round"/></svg>
            </span>
            <span class="menu-chip__label">STREAK</span>
            <strong data-menu-streak>0</strong>
          </div>
          <div class="menu-chip menu-chip--level">
            <strong data-menu-level>LEVEL 1</strong>
          </div>
          <div class="menu-chip menu-chip--coins">
            <span class="menu-chip__ico" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#f5b942"/><text x="12" y="16" text-anchor="middle" font-size="10" font-weight="700" fill="#92400e">$</text></svg>
            </span>
            <strong data-menu-coins>0</strong>
            <button class="menu-chip__plus" data-coming-soon type="button" aria-label="Add coins">+</button>
          </div>
          <button class="menu-icon-btn" data-menu-open-settings type="button" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.6a7.6 7.6 0 0 0-1.7-1L15 4h-6l-.5 2a7.6 7.6 0 0 0-1.7 1L4.5 6.4l-2 3.4 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.6a7.6 7.6 0 0 0 1.7 1l.5 2h6l.5-2a7.6 7.6 0 0 0 1.7-1l2.3.6 2-3.4-2-1.2Z" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>
          </button>
        </header>

        <div class="menu-hero">
          <h1 class="menu-logo" aria-label="Math Rescue">
            <span class="menu-logo__math">MATH</span>
            <span class="menu-logo__rescue">RESCUE</span>
          </h1>
          <p class="menu-ribbon">SOLVE • RESCUE • LEVEL UP</p>
          <div class="menu-scene" aria-hidden="true">
            <img class="menu-scene__bg" src="./assets/chase/scene.png?v=belt-v2" alt="" />
            <img class="menu-scene__shark" src="./assets/chase/shark.png?v=still1" alt="" />
            <img class="menu-scene__cat" src="./assets/chase/cat-run-still.png?v=face-right1" alt="" />
          </div>
        </div>

        <button class="menu-play" data-menu-play type="button">
          <span class="menu-play__icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l12-7z" fill="currentColor"/></svg>
          </span>
          <span class="menu-play__copy">
            <strong>PLAY</strong>
            <small data-menu-play-level>LEVEL 1</small>
          </span>
        </button>

        <button class="menu-journey" data-coming-soon type="button">
          <span class="menu-journey__icon" aria-hidden="true">
            <svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="22" fill="#e8f1ff"/><path d="M10 34l8-14 6 8 6-12 8 18H10Z" fill="#93c5fd"/><path d="M30 14v10l6-3-6-7Z" fill="#2563eb"/></svg>
          </span>
          <span class="menu-journey__copy">
            <strong>JOURNEY</strong>
            <small>Progressive Levels</small>
          </span>
          <span class="menu-journey__chev" aria-hidden="true">›</span>
        </button>

        <div class="menu-features">
          <button class="menu-feature" data-coming-soon type="button">
            <span class="menu-feature__icon menu-feature__icon--daily" aria-hidden="true">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="12" cy="12" r="5" fill="none" stroke="#22c55e" stroke-width="2"/><circle cx="12" cy="12" r="2" fill="#22c55e"/></svg>
            </span>
            <strong>DAILY CHALLENGE</strong>
            <small>Coming soon</small>
          </button>
          <button class="menu-feature" data-coming-soon type="button">
            <span class="menu-feature__icon menu-feature__icon--board" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M4 18h4v-4H4v4Zm6 0h4V8h-4v10Zm6 0h4V4h-4v14Z" fill="#3b82f6"/></svg>
            </span>
            <strong>LEADERBOARD</strong>
            <small>Top Players</small>
          </button>
        </div>

        <section class="menu-top-players" aria-label="Top players">
          <h2>TOP PLAYERS</h2>
          <div class="menu-players" data-menu-players></div>
        </section>
      </div>

      <div class="menu-settings screen-overlay" data-menu-settings hidden>
        <div class="screen-card menu-settings-card">
          <h2>Settings</h2>
          <button class="screen-btn" data-menu-mute type="button">Sound on</button>
          <button class="screen-btn screen-btn--primary" data-menu-change-name type="button">Change player</button>
          <button class="screen-btn screen-btn--ghost" data-menu-close-settings type="button">Close</button>
        </div>
      </div>
      <p class="menu-toast" data-menu-toast hidden>Coming soon</p>
    </div>

    <div class="play-shell" data-play-shell>
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
          <small>Streak</small>
          <strong data-streak>0</strong>
          <div class="streak-segs" aria-hidden="true">
            <i data-streak-seg></i><i data-streak-seg></i><i data-streak-seg></i><i data-streak-seg></i>
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
          <span data-hint-label>Nudge</span>
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
        <small data-board-meta>Board 1 · Task 1/15</small>
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
          <p class="brand-mark">Math Rescue</p>
          <h1>Who is playing?</h1>
          <p class="start-lead">Your name keeps progress on this device.</p>
        </div>
        <label class="profile-entry">
          <span>Your name</span>
          <input data-username type="text" inputmode="text" autocomplete="nickname" maxlength="24" placeholder="Type your name" aria-label="Username for saving progress" />
        </label>
        <p class="start-status-chip" data-nickname-status hidden></p>
        <button class="screen-btn screen-btn--primary" data-nickname-continue type="button" disabled>Continue</button>
        <p class="start-save-hint">Progress saves in this browser.</p>
      </div>
    </div>

    <div class="result-overlay screen-overlay" data-results hidden>
      <section class="result-card" aria-label="Final result">
        <span class="result-kicker">Board complete</span>
        <strong data-result-score>0</strong>
        <p class="result-stars" data-result-stars>★ 0</p>
        <h2 data-result-rank>Practice Explorer</h2>
        <p data-result-message>Try another run.</p>
        <small data-result-best>Best 0</small>
        <div class="local-board" data-result-board></div>
        <button data-new-game type="button">Back to menu</button>
      </section>
    </div>

    <div class="tutorial-overlay" data-tutorial hidden>
      <div class="tutorial-card">
        <strong data-tutorial-title>Step 1</strong>
        <p data-tutorial-body>Tap cards to build your equation.</p>
        <div class="tutorial-actions">
          <button data-tutorial-skip type="button" class="secondary">Skip</button>
          <button data-tutorial-next type="button" class="primary">Got it</button>
        </div>
      </div>
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
  const progress = Math.min(
    steps,
    Math.max(1, Math.ceil((state.taskIndex / state.tasksPerBoard) * steps))
  );
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
    startBtn.disabled = Boolean(state.showTutorial);
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
  els.hintLabel.textContent = state.hintLabel || (review ? "Next" : "Nudge");

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
  if (els.menuStreak) els.menuStreak.textContent = String(state.bestStars || 0);
  if (els.menuLevel) els.menuLevel.textContent = `LEVEL ${level}`;
  if (els.menuCoins) els.menuCoins.textContent = String(state.bestScore || 0);
  if (els.menuPlayLevel) els.menuPlayLevel.textContent = `LEVEL ${level}`;

  if (els.menuMute) {
    els.menuMute.textContent = state.soundOn ? "Sound on" : "Sound off";
    els.menuMute.classList.toggle("is-muted", !state.soundOn);
  }
  if (els.menuSettings) {
    els.menuSettings.hidden = !state.menuSettingsOpen;
  }
  if (els.menuToast) {
    const toast = state.menuToast || "";
    els.menuToast.hidden = !toast;
    els.menuToast.textContent = toast || "Coming soon";
  }

  renderMenuPlayers(els.menuPlayers, state.leaderboard || []);
}

function renderMenuPlayers(container, list) {
  if (!container) return;
  container.replaceChildren();
  const players = (list || []).filter((entry) => (entry.bestScore || 0) > 0).slice(0, 3);
  if (players.length === 0) {
    const empty = document.createElement("p");
    empty.className = "menu-players__empty";
    empty.textContent = "Be the first on this device.";
    container.append(empty);
    return;
  }
  players.forEach((entry, index) => {
    const card = document.createElement("article");
    card.className = `menu-player menu-player--${index + 1}`;
    const initials = playerInitials(entry.name);
    card.innerHTML = `
      <span class="menu-player__medal" aria-hidden="true">${index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
      <span class="menu-player__avatar" aria-hidden="true">${initials}</span>
      <span class="menu-player__meta">
        <strong>${escapeHtml(entry.name || "Player")}</strong>
        <small>${Number(entry.bestScore || 0).toLocaleString()}</small>
      </span>
    `;
    container.append(card);
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
  if (!show) return;
  els.nicknameContinue.disabled = !state.usernameKey;
  if (els.nicknameStatus) {
    if (state.usernameKey) {
      els.nicknameStatus.hidden = false;
      els.nicknameStatus.textContent = `Board ${state.unlockedBoard} unlocked · Best ${state.bestScore}`;
    } else {
      els.nicknameStatus.hidden = true;
      els.nicknameStatus.textContent = "";
    }
  }
}

function updateResults(els, state) {
  const show = state.phase === "finished" && state.result;
  els.resultsOverlay.hidden = !show;
  if (!show) return;
  els.resultScore.textContent = String(state.score);
  els.resultStars.textContent = `★ ${state.runStars} this run`;
  els.resultRank.textContent = state.result.title;
  els.resultMessage.textContent = `${state.result.message} Board ${state.unlockedBoard} is now unlocked.`;
  els.resultBest.textContent = `Best score ${state.bestScore} · Best ★ ${state.bestStars}`;

  const board = els.resultBoard;
  board.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "This device";
  board.append(title);
  const list = state.leaderboard || [];
  if (list.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "No other scores yet.";
    board.append(empty);
    return;
  }
  const ol = document.createElement("ol");
  for (const entry of list) {
    const li = document.createElement("li");
    li.textContent = `${entry.name} — ${entry.bestScore}`;
    ol.append(li);
  }
  board.append(ol);
}

function updateTutorial(els, state) {
  const show = Boolean(state.showTutorial && state.tutorialStep >= 1);
  els.tutorial.hidden = !show;
  if (!show) return;
  const copy = TUTORIAL_COPY[state.tutorialStep] || TUTORIAL_COPY[1];
  els.tutorialTitle.textContent = copy.title;
  els.tutorialBody.textContent = copy.body;
  els.tutorialNext.textContent = state.tutorialStep >= 3 ? "Play" : "Got it";
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
