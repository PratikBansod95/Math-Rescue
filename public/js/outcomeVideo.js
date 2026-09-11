/** Self-hosted success / timeout clips — no external CDN. */

const VIDEO_SOURCES = {
  success: "./assets/videos/video1.mp4",
  timeout: "./assets/videos/video2.mp4",
};

export function createOutcomeVideo(root) {
  const overlay = root.querySelector("[data-outcome-video]");
  const video = root.querySelector("[data-outcome-video-player]");
  const skipBtn = root.querySelector("[data-outcome-video-skip]");

  function clearVideo() {
    if (!video) return;
    video.onended = null;
    video.onerror = null;
    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  function hide() {
    clearVideo();
    if (overlay) overlay.hidden = true;
  }

  function stop() {
    hide();
  }

  function play(type) {
    stop();
    const src = VIDEO_SOURCES[type];
    if (!overlay || !video || !src) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        hide();
        resolve();
      };

      overlay.hidden = false;
      video.src = src;
      video.currentTime = 0;
      video.onended = done;
      video.onerror = done;
      if (skipBtn) {
        skipBtn.onclick = (event) => {
          event.preventDefault();
          done();
        };
      }

      video.play().catch(done);
    });
  }

  return { play, stop };
}
