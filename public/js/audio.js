/** Lightweight Web Audio SFX for MathMaster. */

export function createAudio(isSoundOn = () => true) {
  let context = null;
  let unlocked = false;

  function allowed() {
    return isSoundOn() !== false;
  }

  return {
    unlockFromGesture() {
      ensureContext();
      if (!context) return;
      if (context.state === "suspended") {
        context.resume().then(() => {
          unlocked = true;
        }).catch(() => {});
      } else {
        unlocked = true;
      }
      try {
        const buffer = context.createBuffer(1, 1, 22050);
        const source = context.createBufferSource();
        source.buffer = buffer;
        source.connect(context.destination);
        source.start(0);
      } catch {}
    },

    play(kind) {
      if (!allowed() || !unlocked || !context || context.state !== "running") return;
      if (kind === "correct") playCorrect();
      else if (kind === "incorrect") playIncorrect();
      else if (kind === "skip") playSkip();
    },

    playBlip(frequency, { duration = 0.06, volume = 0.1, type = "sine" } = {}) {
      if (!allowed() || !unlocked || !context || context.state !== "running") return;
      const now = context.currentTime;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.value = frequency;
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain).connect(context.destination);
      osc.start(now);
      osc.stop(now + duration);
    },

    dispose() {
      if (context) {
        context.close().catch(() => {});
        context = null;
      }
      unlocked = false;
    },
  };

  function ensureContext() {
    if (context) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    context = new AudioCtx();
  }

  function tone(freq, start, duration, volume, type = "sine") {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain).connect(context.destination);
    osc.start(start);
    osc.stop(start + duration);
  }

  function playCorrect() {
    const now = context.currentTime;
    tone(523.25, now, 0.09, 0.12);
    tone(659.25, now + 0.08, 0.1, 0.11);
    tone(783.99, now + 0.16, 0.14, 0.1);
  }

  function playIncorrect() {
    const now = context.currentTime;
    tone(220, now, 0.12, 0.12, "triangle");
    tone(165, now + 0.1, 0.18, 0.1, "triangle");
  }

  function playSkip() {
    const now = context.currentTime;
    tone(392, now, 0.08, 0.09);
    tone(330, now + 0.09, 0.12, 0.08);
  }
}
