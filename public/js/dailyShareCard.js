/** Canvas share card for Daily Rescue — chase track, no puzzle spoilers. */

import {
  buildChaseTrackBar,
  computeEscapeMetrics,
  formatDurationClock,
  rescueNumber,
} from "./daily.js";

const BASE_WIDTH = 720;
const BASE_HEIGHT = 420;

export function renderDailyShareCard(result = {}, { width = BASE_WIDTH, height = BASE_HEIGHT } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const sx = width / BASE_WIDTH;
  const sy = height / BASE_HEIGHT;
  const fontScale = Math.min(sx, sy);

  const dateKey = result.dateKey || "";
  const succeeded = Boolean(result.succeeded);
  const metrics = computeEscapeMetrics({
    succeeded,
    timeSeconds: result.timeSeconds,
    timerLimit: result.timerLimit,
    operationCount: result.operationCount,
    usedHint: result.usedHint,
  });
  const track = buildChaseTrackBar(metrics);
  const rescue = rescueNumber(dateKey);
  const clock = formatDurationClock(result.timeSeconds);
  const ops = Math.max(0, Math.floor(Number(result.operationCount) || 0));
  const streak = Math.max(0, Math.floor(Number(result.rescueStreak) || 0));

  const padX = 36 * sx;
  const padBottom = 36 * sy;

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#e8f1ff");
  bg.addColorStop(1, "#cfe4ff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";

  ctx.fillStyle = "#1a2b4a";
  ctx.font = `bold ${Math.round(34 * fontScale)}px Fredoka, Quicksand, sans-serif`;
  ctx.fillText(`Rescue #${rescue}`, padX, 58 * sy);

  ctx.font = `600 ${Math.round(22 * fontScale)}px Quicksand, sans-serif`;
  ctx.fillStyle = "#334155";
  const headline = succeeded
    ? `Escaped by ${metrics.escapePercent}%`
    : "Shark caught the cat";
  ctx.fillText(headline, padX, 96 * sy);

  ctx.font = `700 ${Math.round(28 * fontScale)}px Quicksand, sans-serif`;
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`${clock} · ${ops} ops`, padX, 138 * sy);

  let trackY = 230 * sy;
  if (streak > 0) {
    ctx.font = `600 ${Math.round(20 * fontScale)}px Quicksand, sans-serif`;
    ctx.fillStyle = "#ea580c";
    ctx.fillText(`Rescue streak ${streak}`, padX, 172 * sy);
  } else {
    trackY = 200 * sy;
  }

  const maxTrackWidth = width - padX * 2;
  let trackFont = Math.round(32 * fontScale);
  ctx.font = `${trackFont}px sans-serif`;
  let trackText = track;
  while (trackText.length > 3 && ctx.measureText(trackText).width > maxTrackWidth) {
    trackFont = Math.max(18, trackFont - 2);
    ctx.font = `${trackFont}px sans-serif`;
    if (trackFont <= 18) {
      trackText = trackText.slice(0, Math.max(0, trackText.length - 2));
    }
  }
  ctx.fillText(trackText, padX, trackY);

  const lineY = Math.min(height - 48 * sy, trackY + 30 * sy);
  ctx.strokeStyle = "rgba(43, 101, 236, 0.35)";
  ctx.lineWidth = Math.max(2, 3 * fontScale);
  ctx.beginPath();
  ctx.moveTo(padX, lineY);
  ctx.lineTo(width - padX, lineY);
  ctx.stroke();

  ctx.font = `600 ${Math.round(18 * fontScale)}px Quicksand, sans-serif`;
  ctx.fillStyle = "#64748b";
  ctx.fillText("Math Rescue · Daily Rescue", padX, height - padBottom);

  return canvas;
}

/** Paint the on-screen preview (crisp on retina, correct aspect ratio). */
export function paintDailySharePreview(canvas, result) {
  if (!canvas) return;
  const card = renderDailyShareCard(result);
  const cssWidth = Math.min(320, Math.max(260, canvas.parentElement?.clientWidth || 320));
  const cssHeight = Math.round(cssWidth * (BASE_HEIGHT / BASE_WIDTH));
  const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.clearRect(0, 0, cssWidth, cssHeight);
  ctx.drawImage(card, 0, 0, BASE_WIDTH, BASE_HEIGHT, 0, 0, cssWidth, cssHeight);
}

export async function dailyShareCardBlob(result, options = {}) {
  const canvas = renderDailyShareCard(result, options);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png", 0.92);
  });
}

export async function shareDailyResult(result, { text = "" } = {}) {
  const shareText = text || result.shareText || "";
  const blob = await dailyShareCardBlob(result);
  const file = blob ? new File([blob], `rescue-${rescueNumber(result.dateKey)}.png`, { type: "image/png" }) : null;

  if (file && navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Daily Rescue",
      text: shareText,
      files: [file],
    });
    return "shared";
  }

  if (navigator.share) {
    await navigator.share({ title: "Daily Rescue", text: shareText });
    return "shared";
  }

  if (blob) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": new Blob([shareText], { type: "text/plain" }),
          "image/png": blob,
        }),
      ]);
      return "clipboard";
    } catch {
      // fall through to text only
    }
  }

  await navigator.clipboard.writeText(shareText);
  return "clipboard-text";
}
