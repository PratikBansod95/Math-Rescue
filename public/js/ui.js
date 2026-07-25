const OPERATORS = [
  { label: "+", value: " + " },
  { label: "−", value: " - " },
  { label: "×", value: " * " },
  { label: "÷", value: " / " },
  { label: "(", value: "(" },
  { label: ")", value: ")" },
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
    topRound: shell.querySelector("[data-round]"),
    topScore: shell.querySelector("[data-score]"),
    topStars: shell.querySelector("[data-stars]"),
    bestScore: shell.querySelector("[data-best]"),
    muteButton: shell.querySelector("[data-mute]"),
    playerButton: shell.querySelector("[data-player]"),
    numbers: shell.querySelector("[data-numbers]"),
    input: shell.querySelector("[data-input]"),
    feedback: shell.querySelector("[data-feedback]"),
    feedbackDetail: shell.querySelector("[data-feedback-detail]"),
    feedbackSparkles: shell.querySelector("[data-sparkles]"),
    correction: shell.querySelector("[data-correction]"),
    operatorPad: shell.querySelector("[data-operators]"),
    clearButton: shell.querySelector("[data-clear]"),
    submitButton: shell.querySelector("[data-submit]"),
    hintButton: shell.querySelector("[data-hint]"),
    startOverlay: shell.querySelector("[data-start-overlay]"),
    startButton: shell.querySelector("[data-start]"),
    startText: shell.querySelector("[data-start-text]"),
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

      els.topRound.textContent = `Board ${state.boardIndex} · Task ${state.taskIndex}/${state.tasksPerBoard}`;
      els.topScore.textContent = String(state.score);
      els.topStars.textContent = `★ ${state.runStars || 0}`;
      els.bestScore.textContent = `Unlocked ${state.unlockedBoard}`;
      els.muteButton.textContent = state.soundOn ? "🔊" : "🔇";
      els.muteButton.setAttribute("aria-label", state.soundOn ? "Mute sound" : "Unmute sound");
      els.playerButton.textContent = state.usernameKey ? state.username : "Player";
      els.playerButton.hidden = !state.usernameKey;
      els.playerButton.setAttribute(
        "aria-label",
        state.usernameKey ? `Saved player ${state.username}. Switch player` : "Player"
      );

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
      els.input.textContent = state.expression || " ";
      els.feedback.textContent = state.feedback.text;
      els.feedback.dataset.kind = state.feedback.kind;
      els.feedbackDetail.textContent = state.feedback.detail || "";
      els.feedbackDetail.hidden = !state.feedback.detail;
      els.feedbackSparkles.hidden = state.feedback.kind !== "good";

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
    <div class="math-backdrop" aria-hidden="true"></div>
    <div class="math-grid" aria-hidden="true"></div>

    <header class="math-hud" aria-label="Current run status">
      <div class="hud-badge">
        <span>Board / Task</span>
        <strong data-round>Board 1 · Task 1/15</strong>
      </div>
      <div class="hud-center">
        <button class="hud-player" data-player type="button" hidden>Player</button>
        <div class="hud-best" data-best>Unlocked 1</div>
        <button class="hud-mute" data-mute type="button" aria-label="Mute sound">🔊</button>
      </div>
      <div class="hud-badge hud-badge--score">
        <span>Score · Stars</span>
        <strong><span data-score>0</span> · <span data-stars>★ 0</span></strong>
      </div>
    </header>

    <main class="math-play" aria-label="Math Rescue puzzle board">
      <section class="math-card" aria-label="Target and equation">
        <div class="math-stage">
          <div class="card-cross" data-numbers aria-label="Four number cards and center target"></div>
        </div>

        <div class="equation-box">
          <div class="equation-box__head">
            <span>Equation</span>
            <span class="equation-box__hint">Tap cards &amp; operators</span>
          </div>
          <div data-input class="equation-input" role="textbox" aria-readonly="true" aria-label="Your equation"> </div>
        </div>

        <section class="correction-panel" data-correction hidden aria-live="polite"></section>
      </section>

      <section class="feedback-line" aria-live="polite">
        <span data-sparkles class="sparkle-decal" aria-hidden="true" hidden></span>
        <div>
          <strong data-feedback data-kind="neutral">Use cards without repeating them to match the target.</strong>
          <small data-feedback-detail hidden></small>
        </div>
      </section>
    </main>

    <footer class="control-deck" aria-label="Equation controls">
      <div class="operator-grid" data-operators></div>
      <div class="action-row">
        <button class="secondary danger" data-clear type="button">Clear</button>
        <button class="primary" data-submit type="button">Submit</button>
        <button class="secondary" data-hint type="button">Hint</button>
      </div>
    </footer>

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
  backspace.className = "operator-button operator-button--wide";
  backspace.textContent = "⌫";
  backspace.setAttribute("aria-label", "Backspace");
  backspace.addEventListener("click", onBackspace);
  container.append(backspace);
}

function renderCards(container, state, onAppend) {
  container.replaceChildren();
  const availability = countByKey(state.round.cards);
  const positions = ["top", "left", "right", "bottom"];

  for (let i = 0; i < state.round.cards.length; i += 1) {
    const card = state.round.cards[i];
    const used = state.usedCounts.get(card.key) || 0;
    const max = availability.get(card.key) || 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `number-card number-card--${positions[i]}`;
    button.disabled = state.phase !== "playing" || used >= max;
    button.setAttribute("aria-label", `Use number card ${card.label}`);
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
  target.innerHTML = `<span class="target-badge__label">Target</span><strong class="target-badge__value">${state.round.targetLabel || state.round.target}</strong>`;
  container.append(target);
}

function updateControls(els, state) {
  const playing = state.phase === "playing";
  const review = state.phase === "review";
  els.clearButton.disabled = !playing;
  els.submitButton.disabled = !playing;
  els.hintButton.disabled = !playing && !review;
  els.hintButton.textContent = state.hintLabel || (review ? "Next" : "Hint");
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
