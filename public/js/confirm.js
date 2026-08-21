/** In-app confirmation dialog — promise-based, accessible alertdialog. */

export function createConfirmDialog() {
  const overlay = document.createElement("div");
  overlay.className = "confirm-overlay";
  overlay.dataset.confirm = "";
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="confirm-overlay__backdrop" data-confirm-backdrop></div>
    <div class="screen-card confirm-card" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
      <p class="confirm-card__kicker">Please confirm</p>
      <h2 id="confirm-title" data-confirm-title>Are you sure?</h2>
      <p id="confirm-message" class="confirm-card__message" data-confirm-message></p>
      <div class="confirm-actions">
        <button class="screen-btn screen-btn--ghost" data-confirm-cancel type="button">No</button>
        <button class="screen-btn screen-btn--primary" data-confirm-ok type="button">Yes</button>
      </div>
    </div>
  `;
  document.body.append(overlay);

  const els = {
    overlay,
    title: overlay.querySelector("[data-confirm-title]"),
    message: overlay.querySelector("[data-confirm-message]"),
    cancel: overlay.querySelector("[data-confirm-cancel]"),
    ok: overlay.querySelector("[data-confirm-ok]"),
    backdrop: overlay.querySelector("[data-confirm-backdrop]"),
  };

  let resolver = null;

  function close(result) {
    if (!resolver) return;
    const resolve = resolver;
    resolver = null;
    overlay.hidden = true;
    resolve(result);
  }

  els.cancel.addEventListener("click", () => close(false));
  els.ok.addEventListener("click", () => close(true));
  els.backdrop.addEventListener("click", () => close(false));

  return {
    isOpen() {
      return Boolean(resolver);
    },

    ask({
      title = "Are you sure?",
      message = "",
      confirmLabel = "Yes",
      cancelLabel = "No",
      danger = false,
    } = {}) {
      if (resolver) {
        return Promise.resolve(false);
      }
      els.title.textContent = title;
      els.message.textContent = message;
      els.cancel.textContent = cancelLabel;
      els.ok.textContent = confirmLabel;
      els.ok.classList.toggle("screen-btn--danger", Boolean(danger));
      els.ok.classList.toggle("screen-btn--primary", !danger);
      overlay.hidden = false;
      window.requestAnimationFrame(() => els.cancel.focus());
      return new Promise((resolve) => {
        resolver = resolve;
      });
    },

    cancel() {
      close(false);
    },

    destroy() {
      close(false);
      overlay.remove();
    },
  };
}
