/** Chase motion driver — cat GIF + shark bite / post-eat WebPs. */

export const CAT_RUN_GIF = "./assets/chase/cat-run.webp?v=gif2";
export const SHARK_BITE = "./assets/chase/shark-bite.webp?v=bite1";
export const SHARK_ATE = "./assets/chase/shark-ate.webp?v=ate1";

/**
 * @param {{
 *   img: HTMLImageElement | null,
 *   shark?: HTMLImageElement | null,
 *   panel: HTMLElement | null,
 *   cat: HTMLElement | null,
 *   railFill: HTMLElement | null,
 *   railGlow: HTMLElement | null,
 *   chaseTimer: HTMLElement | null,
 *   chaseBar: HTMLElement | null,
 * }} els
 */
export function createCatRunAnimator(els) {
  const img = els?.img ?? null;
  const shark = els?.shark ?? null;
  const panel = els?.panel ?? null;
  const cat = els?.cat ?? null;
  const railFill = els?.railFill ?? null;
  const railGlow = els?.railGlow ?? null;
  const chaseTimer = els?.chaseTimer ?? null;
  const chaseBar = els?.chaseBar ?? null;

  let raf = 0;
  let lastTs = 0;
  let playing = false;
  let limitSec = 45;
  let deadline = 0;
  let sharkMode = "bite";

  if (img) {
    img.src = CAT_RUN_GIF;
    img.classList.add("is-gif");
  }
  if (shark) {
    shark.src = SHARK_BITE;
  }
  if (cat) {
    cat.querySelectorAll(".chase-cat__frame.is-back").forEach((el) => el.remove());
  }

  // Warm post-eat asset
  const warm = new Image();
  warm.src = SHARK_ATE;

  function setSharkSrc(src, mode) {
    if (!shark) return;
    if (sharkMode === mode && shark.getAttribute("src")?.includes(src.split("?")[0].split("/").pop())) {
      return;
    }
    sharkMode = mode;
    shark.src = src;
  }

  function formatClock(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${String(secs).padStart(2, "0")}`;
  }

  function applyProgress(progress, ratio, secondsCeil) {
    const catAlong = 1 - progress;
    const p = String(progress);
    if (cat) cat.style.setProperty("--chase-progress", p);
    if (panel) panel.style.setProperty("--chase-progress", p);
    if (railFill) railFill.style.width = `${progress * 100}%`;
    if (railGlow) {
      railGlow.style.left = `calc(${catAlong * 100}% - 0.55rem)`;
      railGlow.style.opacity = "1";
    }
    if (chaseBar) chaseBar.style.width = `${ratio * 100}%`;
    if (chaseTimer) chaseTimer.textContent = formatClock(secondsCeil);
  }

  function setGifPlaying(on) {
    if (!img) return;
    if (on) {
      if (!img.src.includes("cat-run.webp") && !img.src.includes("cat-run.gif")) {
        img.src = CAT_RUN_GIF;
      } else if (!playing) {
        const src = CAT_RUN_GIF;
        img.src = "";
        img.src = src;
      }
    }
  }

  function tick(ts) {
    if (!playing) return;
    if (!lastTs) lastTs = ts;
    lastTs = ts;

    const remainingMs = Math.max(0, deadline - performance.now());
    const remainingSec = remainingMs / 1000;
    const ratio = Math.min(1, Math.max(0, remainingSec / limitSec));
    const progress = 1 - ratio;
    const secondsCeil = Math.max(0, Math.ceil(remainingSec - 1e-6));

    applyProgress(progress, ratio, secondsCeil);

    const urgent = remainingSec <= 8 || progress >= 0.75;
    if (panel) {
      panel.classList.toggle("is-urgent", urgent);
      panel.classList.toggle("is-running", !urgent);
    }

    raf = requestAnimationFrame(tick);
  }

  function startLoop() {
    if (playing) return;
    setSharkSrc(SHARK_BITE, "bite");
    setGifPlaying(true);
    playing = true;
    lastTs = 0;
    raf = requestAnimationFrame(tick);
  }

  function stopLoop() {
    playing = false;
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    lastTs = 0;
  }

  /**
   * @param {{
   *   pose: "idle"|"running"|"urgent"|"safe"|"caught"|"ate",
   *   limit?: number,
   *   deadline?: number,
   *   timeLeft?: number,
   *   idle?: boolean,
   * }} opts
   */
  function sync(opts) {
    limitSec = Math.max(1, Number(opts.limit) || 45);

    if (opts.deadline != null && Number.isFinite(opts.deadline)) {
      deadline = opts.deadline;
    }

    const pose = opts.pose || "idle";

    if (pose === "caught") {
      stopLoop();
      setSharkSrc(SHARK_BITE, "bite");
      applyProgress(1, 0, 0);
      if (cat) cat.style.opacity = "";
      return;
    }

    if (pose === "ate") {
      stopLoop();
      setSharkSrc(SHARK_ATE, "ate");
      applyProgress(1, 0, 0);
      if (cat) cat.style.opacity = "0";
      return;
    }

    if (pose === "safe" || pose === "idle" || opts.idle) {
      stopLoop();
      setSharkSrc(SHARK_BITE, "bite");
      const seconds = Math.max(0, Number(opts.timeLeft) || limitSec);
      applyProgress(0, 1, seconds);
      if (railGlow) railGlow.style.opacity = "0";
      if (cat) cat.style.opacity = "";
      return;
    }

    if (!deadline) {
      const left = Math.max(0, Number(opts.timeLeft) || limitSec);
      deadline = performance.now() + left * 1000;
    }
    startLoop();
  }

  function destroy() {
    stopLoop();
  }

  return { sync, destroy };
}
