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
    streakFill: shell.querySelector("[data-streak-fill]"),
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

      const streak = Math.min(3, Math.max(0, state.runStars || 0));
      els.streakValue.textContent = String(streak);
      els.streakFill.style.width = `${(streak / 3) * 100}%`;

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
      els.playerButton.textContent = state.usernameKey ? state.username : "Player";
      els.playerButton.hidden = !state.usernameKey;

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
      els.equationHint.innerHTML = `💡 Use <b>+ − × ÷</b> and <b>( )</b> to make <b data-target-chip>${
        state.round?.targetLabel || state.round?.target || "?"
      }</b>`;

      els.feedback.textContent = state.feedback.text;
      els.feedback.dataset.kind = state.feedback.kind;
      els.feedbackDetail.textContent = state.feedback.detail || "";
      els.feedbackDetail.hidden = !state.feedback.detail;

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
      <div class="play-doodles">
        <span>2x+3=7</span>
        <span>a²+b²=c²</span>
        <span>√</x</span>
        <span>π</span>
        <span>(a+b)²</span>
      </div>
    </div>

    <header class="top-bar" aria-label="Game status">
      <button class="icon-btn" data-menu type="button" aria-label="Switch player">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>
      </button>

      <div class="stat-chip stat-chip--streak">
        <span class="stat-chip__ico" aria-hidden="true">🏆</span>
        <div>
          <small>Streak</small>
          <strong data-streak>0</strong>
          <div class="streak-bar"><i data-streak-fill></i></div>
        </div>
      </div>

      <div class="level-pill" aria-label="Current level">
        <strong data-level>LEVEL 1</strong>
        <div class="level-track" data-level-track></div>
      </div>

      <div class="stat-chip stat-chip--coins">
        <span class="stat-chip__ico" aria-hidden="true">🪙</span>
        <strong data-coins>0</strong>
      </div>

      <button class="icon-btn" data-mute type="button" aria-label="Mute sound">
        <svg class="ico-gear" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 13a7.8 7.8 0 0 0 .1-2l2-1.2-2-3.4-2.3.7a7.6 7.6 0 0 0-1.7-1L15 4h-6l-.5 2.1a7.6 7.6 0 0 0-1.7 1L4.5 6.4l-2 3.4 2 1.2a7.8 7.8 0 0 0 0 2l-2 1.2 2 3.4 2.3-.7a7.6 7.6 0 0 0 1.7 1L9 20h6l.5-2.1a7.6 7.6 0 0 0 1.7-1l2.3.7 2-3.4-2-1.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
      </button>
    </header>

    <main class="math-play" aria-label="Math Rescue puzzle board">
      <section class="board-stage" aria-label="Target and cards">
        <div class="orbit-ring" aria-hidden="true"></div>
        <div class="card-cross" data-numbers aria-label="Four number cards and center target"></div>
      </section>

      <section class="equation-panel" aria-label="Equation builder">
        <div class="equation-panel__head">
          <span class="equation-panel__title"><i aria-hidden="true">Σ</i> Equation</span>
          <button class="player-chip" data-player type="button" hidden>Player</button>
        </div>
        <div class="equation-field">
          <div data-input class="equation-input" data-empty="true" role="textbox" aria-readonly="true" aria-label="Your equation"></div>
          <span class="equation-pencil" aria-hidden="true">✎</span>
        </div>
        <p class="equation-tip" data-equation-hint>💡 Use <b>+ − × ÷</b> and <b>( )</b> to make <b>?</b></p>
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
        <button class="btn-clear" data-clear type="button"><span aria-hidden="true">🗑</span> Clear</button>
        <button class="btn-submit" data-submit type="button"><span aria-hidden="true">✈</span> Submit</button>
        <button class="btn-hint" data-hint type="button">
          <span aria-hidden="true">💡</span>
          <span data-hint-label>Hint</span>
          <span class="hint-badge" data-hint-badge>2</span>
        </button>
      </div>
    </footer>

    <aside class="play-footer" aria-label="Player status">
      <div class="mascot" aria-hidden="true">
        <svg viewBox="0 0 72 72" width="56" height="56">
          <ellipse cx="36" cy="64" rx="18" ry="4" fill="#c5d4ea"/>
          <rect x="16" y="22" width="40" height="34" rx="14" fill="#eef5ff" stroke="#3b82f6" stroke-width="2"/>
          <circle cx="28" cy="38" r="4" fill="#1e3a5f"/>
          <path d="M40 36c2.5 0 5 2 5 4.5" fill="none" stroke="#1e3a5f" stroke-width="2.2" stroke-linecap="round"/>
          <path d="M30 48c3 2.5 9 2.5 12 0" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"/>
          <rect x="30" y="10" width="12" height="10" rx="3" fill="#93c5fd"/>
          <circle cx="36" cy="10" r="3" fill="#60a5fa"/>
          <path d="M52 40l10-8" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/>
          <circle cx="63" cy="30" r="4" fill="#60a5fa"/>
        </svg>
      </div>
      <div class="welcome-card">
        <strong data-welcome>Welcome to Math Rescue.</strong>
        <small data-board-meta>Board 1 · Task 1/15</small>
      </div>
      <div class="best-card">
        <span aria-hidden="true">🏆</span>
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
    button.innerHTML = `<span class="number-card__badge" aria-hidden="true">${cardIcon(theme.icon)}</span>`;
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
  target.innerHTML = `<span class="target-badge__label">Target</span><strong class="target-badge__value">${
    state.round.targetLabel || state.round.target
  }</strong>`;
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
