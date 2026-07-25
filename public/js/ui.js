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
    streakValue: shell.querySelector("[data-streak]"),
    streakSegs: shell.querySelectorAll("[data-streak-seg]"),
    levelLabel: shell.querySelector("[data-level]"),
    levelTrack: shell.querySelector("[data-level-track]"),
    coins: shell.querySelector("[data-coins]"),
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
    hintBadge: shell.querySelector("[data-hint-badge]"),
    menuButton: shell.querySelector("[data-menu]"),
    muteButton: shell.querySelector("[data-mute]"),
    playerButton: shell.querySelector("[data-player]"),
    startOverlay: shell.querySelector("[data-start-overlay]"),
    startButton: shell.querySelector("[data-start]"),
    startText: shell.querySelector("[data-start-text]"),
    startStatus: shell.querySelector("[data-start-status]"),
    usernameInput: shell.querySelector("[data-username]"),
    profileText: shell.querySelector("[data-profile-text]"),
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
  buildOperatorPad(els.operatorPad, handlers.onAppend, handlers.onBackspace);

  on(els.startButton, "click", handlers.onStart);
  on(els.usernameInput, "input", () => handlers.onUsernameInput(els.usernameInput.value));
  on(els.usernameInput, "keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handlers.onStart();
    }
  });

  on(els.clearButton, "click", handlers.onClear);
  on(els.submitButton, "click", handlers.onSubmit);
  on(els.hintButton, "click", handlers.onHintOrNext);
  on(els.newGameButton, "click", handlers.onNewGame);
  on(els.muteButton, "click", handlers.onToggleSound);
  on(els.menuButton, "click", handlers.onSwitchPlayer);
  on(els.playerButton, "click", handlers.onSwitchPlayer);
  on(els.tutorialNext, "click", handlers.onTutorialNext);
  on(els.tutorialSkip, "click", handlers.onTutorialSkip);

  return {
    render(state, options = {}) {
      shell.dataset.phase = state.phase;
      shell.classList.toggle("is-shaking", Boolean(state.shake));
      shell.classList.toggle("tutorial-on", Boolean(state.showTutorial));
      if (state.showTutorial) shell.dataset.tutorialStep = String(state.tutorialStep);
      else delete shell.dataset.tutorialStep;

      const segsOn = Math.min(4, state.runStars || 0);
      els.streakValue.textContent = String(state.runStars || 0);
      els.streakSegs.forEach((seg, index) => {
        seg.classList.toggle("is-on", index < segsOn);
      });

      els.levelLabel.textContent = `LEVEL ${state.boardIndex}`;
      renderLevelTrack(els.levelTrack, state);

      els.coins.textContent = String(state.score);
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
      if (state.usernameKey) {
        els.profileText.hidden = false;
        els.profileText.textContent = "Welcome";
      } else {
        els.profileText.hidden = true;
        els.profileText.textContent = "";
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
      renderCards(els.numbers, state, handlers.onAppend);
      updateControls(els, state);
      updateStartOverlay(els, state);
      updateResults(els, state);
      updateTutorial(els, state);
    },

    hideStartOverlay() {
      els.startOverlay.hidden = true;
    },

    destroy() {
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
    <div class="play-backdrop" aria-hidden="true">
      <div class="play-grid"></div>
      <img class="play-bg-art" src="./assets/play-bg.svg" alt="" />
    </div>

    <header class="top-bar" aria-label="Game status">
      <button class="icon-btn" data-menu type="button" aria-label="Switch player">
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
          <span class="equation-pencil" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="m5 16.5 9.8-9.8 2.5 2.5L7.5 19H5v-2.5Zm11.2-8.7 1.5-1.5a1.2 1.2 0 0 1 1.7 0l1.1 1.1a1.2 1.2 0 0 1 0 1.7l-1.5 1.5-2.8-2.8Z" fill="currentColor"/></svg>
          </span>
        </div>
        <p class="equation-tip" data-equation-hint></p>
        <p class="play-status">
          <strong data-welcome>Welcome to Math Rescue.</strong>
          <small data-board-meta>Board 1 · Task 1/15</small>
        </p>
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
          <span class="hint-badge" data-hint-badge>2</span>
        </button>
      </div>
    </footer>

    <aside class="play-footer" aria-label="Player status">
      <div class="mascot" aria-hidden="true">
        <img src="./assets/mascot.svg" alt="" width="88" height="88" />
      </div>
      <div class="welcome-card welcome-card--footer">
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

    <div class="start-overlay" data-start-overlay>
      <div class="start-prompt">
        <div class="start-hero">
          <p class="brand-mark">Math Rescue</p>
          <h1>Combine four cards. Hit the target.</h1>
          <p class="start-lead">Build smart equations with +, −, ×, ÷ and parentheses.</p>
        </div>

        <label class="profile-entry">
          <span>Your name</span>
          <input data-username type="text" inputmode="text" autocomplete="nickname" maxlength="24" placeholder="Type your name" aria-label="Username for saving progress" />
        </label>
        <p class="start-status" data-profile-text hidden>Welcome</p>

        <p class="start-note" data-start-text>Four cards. One target. Make the equation.</p>
        <p class="start-status-chip" data-start-status hidden></p>
        <button data-start type="button" disabled>Start playing</button>
        <p class="start-save-hint">Progress saves in this browser. Cloud save comes later.</p>
      </div>
    </div>

    <div class="result-overlay" data-results hidden>
      <section class="result-card" aria-label="Final result">
        <span class="result-kicker">Board complete</span>
        <strong data-result-score>0</strong>
        <p class="result-stars" data-result-stars>★ 0</p>
        <h2 data-result-rank>Practice Explorer</h2>
        <p data-result-message>Try another run.</p>
        <small data-result-best>Best 0</small>
        <div class="local-board" data-result-board></div>
        <button data-new-game type="button">Start unlocked board</button>
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

function renderCards(container, state, onAppend) {
  container.replaceChildren();
  const availability = countByKey(state.round.cards);

  for (let i = 0; i < state.round.cards.length; i += 1) {
    const card = state.round.cards[i];
    const theme = CARD_THEMES[i] || CARD_THEMES[0];
    const used = state.usedCounts.get(card.key) || 0;
    const max = availability.get(card.key) || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-card number-card--${theme.position} number-card--${theme.tone}`;
    button.disabled = state.phase !== "playing" || used >= max;
    button.setAttribute("aria-label", `Use number card ${card.label}`);
    button.innerHTML = `
      <span class="number-card__badge" aria-hidden="true">${cardIcon(theme.icon)}</span>
      <span class="number-card__tech number-card__tech--tl" aria-hidden="true"></span>
      <span class="number-card__tech number-card__tech--br" aria-hidden="true"></span>
      <span class="number-card__shine" aria-hidden="true"></span>
    `;
    button.append(renderCardValue(card));
    button.addEventListener("click", () => onAppend(card.input));
    container.append(button);
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
  const playing = state.phase === "playing";
  const review = state.phase === "review";
  els.clearButton.disabled = !playing;
  els.submitButton.disabled = !playing;
  els.hintButton.disabled = !playing && !review;
  els.hintLabel.textContent = state.hintLabel || (review ? "Next" : "Hint");

  const hintsLeft = review ? 0 : Math.max(0, 2 - (state.hintStage || 0));
  els.hintBadge.textContent = String(hintsLeft);
  els.hintBadge.hidden = review || hintsLeft <= 0;

  for (const button of els.operatorPad.querySelectorAll("button")) {
    button.disabled = !playing;
  }
}

function updateStartOverlay(els, state) {
  if (state.phase === "playing" || state.phase === "review" || state.phase === "finished") {
    return;
  }
  els.startOverlay.hidden = false;
  els.startButton.disabled = state.phase !== "ready" || !state.usernameKey;
  els.startButton.textContent = state.usernameKey ? "Continue" : "Start playing";
  els.startText.textContent = "Four cards. One target. Make the equation.";

  if (els.startStatus) {
    if (state.usernameKey) {
      els.startStatus.hidden = false;
      els.startStatus.textContent = `Board ${state.unlockedBoard} unlocked · Best ${state.bestScore}`;
    } else {
      els.startStatus.hidden = true;
      els.startStatus.textContent = "";
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
