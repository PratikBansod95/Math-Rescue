/** Lightweight canvas confetti burst for puzzle wins. */

const COLORS = ["#f59e0b", "#38bdf8", "#34d399", "#fb7185", "#fde68a", "#60a5fa", "#f97316"];

/**
 * @param {HTMLElement | null} host
 * @param {{ count?: number, durationMs?: number }} [opts]
 */
export function burstConfetti(host, opts = {}) {
  if (!host) return;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;

  const count = Math.max(24, Math.min(120, opts.count ?? 72));
  const durationMs = opts.durationMs ?? 2600;

  host.querySelectorAll(".confetti-layer").forEach((el) => el.remove());

  const canvas = document.createElement("canvas");
  canvas.className = "confetti-layer";
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let w = 0;
  let h = 0;

  function resize() {
    const rect = host.getBoundingClientRect();
    w = Math.max(1, Math.floor(rect.width));
    h = Math.max(1, Math.floor(rect.height));
    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  resize();

  const originX = w * 0.72;
  const originY = h * 0.42;
  const pieces = Array.from({ length: count }, () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.15;
    const speed = 2.8 + Math.random() * 5.4;
    return {
      x: originX + (Math.random() - 0.5) * 28,
      y: originY + (Math.random() - 0.5) * 16,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.2,
      w: 4 + Math.random() * 5,
      h: 6 + Math.random() * 8,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.35,
      color: COLORS[(Math.random() * COLORS.length) | 0],
      life: 1,
    };
  });

  const started = performance.now();
  let raf = 0;

  function frame(now) {
    const elapsed = now - started;
    const t = Math.min(1, elapsed / durationMs);
    ctx.clearRect(0, 0, w, h);

    for (const p of pieces) {
      p.vy += 0.12;
      p.vx *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life = 1 - t;

      if (p.life <= 0.02) continue;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }

    if (t < 1) {
      raf = requestAnimationFrame(frame);
      return;
    }
    canvas.remove();
  }

  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    canvas.remove();
  };
}
