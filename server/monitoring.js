let sentryParsed = null;

function parseSentryDsn(dsn) {
  if (sentryParsed !== null) return sentryParsed;
  const raw = String(process.env.SENTRY_DSN || "").trim();
  if (!raw) {
    sentryParsed = false;
    return sentryParsed;
  }
  try {
    const url = new URL(raw);
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    const publicKey = url.username;
    if (!host || !projectId || !publicKey) {
      sentryParsed = false;
      return sentryParsed;
    }
    sentryParsed = {
      storeUrl: `https://${host}/api/${projectId}/store/`,
      authHeader: `Sentry sentry_version=7, sentry_client=math-rescue-api/1.0, sentry_key=${publicKey}`,
    };
    return sentryParsed;
  } catch {
    sentryParsed = false;
    return sentryParsed;
  }
}

export function captureException(error, context = {}) {
  const message = String(error?.message || error || "Unknown error");
  console.error("[math-rescue]", message, context);

  const sentry = parseSentryDsn(process.env.SENTRY_DSN);
  if (!sentry) return;

  const payload = {
    event_id: cryptoRandomId(),
    platform: "node",
    level: "error",
    message,
    tags: {
      route: context.route || "unknown",
      method: context.method || "unknown",
    },
    extra: context,
  };

  void fetch(sentry.storeUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: sentry.authHeader,
    },
    body: JSON.stringify(payload),
  }).catch(() => {});
}

function cryptoRandomId() {
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
