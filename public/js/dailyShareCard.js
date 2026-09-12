/** Canvas share card for Daily Rescue — chase track, no puzzle spoilers. */

import {
  buildChaseTrackBar,
  computeEscapeMetrics,
  formatDurationClock,
  rescueNumber,
} from "./daily.js";

export function renderDailyShareCard(result = {}, { width = 720, height = 420 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

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

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, "#e8f1ff");
  bg.addColorStop(1, "#cfe4ff");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#1a2b4a";
  ctx.font = "bold 34px Fredoka, Quicksand, sans-serif";
  ctx.fillText(`Rescue #${rescue}`, 36, 58);

  ctx.font = "600 22px Quicksand, sans-serif";
  ctx.fillStyle = "#334155";
  const headline = succeeded
    ? `Escaped by ${metrics.escapePercent}%`
    : "Shark caught the cat";
  ctx.fillText(headline, 36, 96);

  ctx.font = "700 28px Quicksand, sans-serif";
  ctx.fillStyle = "#0f172a";
  ctx.fillText(`${clock} · ${ops} ops`, 36, 138);

  if (streak > 0) {
    ctx.font = "600 20px Quicksand, sans-serif";
    ctx.fillStyle = "#ea580c";
    ctx.fillText(`Rescue streak ${streak}`, 36, 172);
  }

  ctx.font = "32px sans-serif";
  ctx.fillText(track, 36, 230);

  ctx.strokeStyle = "rgba(43, 101, 236, 0.35)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(36, 260);
  ctx.lineTo(width - 36, 260);
  ctx.stroke();

  ctx.font = "600 18px Quicksand, sans-serif";
  ctx.fillStyle = "#64748b";
  ctx.fillText("Math Rescue · Daily Rescue", 36, height - 36);

  return canvas;
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
