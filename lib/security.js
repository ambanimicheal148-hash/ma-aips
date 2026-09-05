const buckets = new Map();
const incidents = [];
const WINDOW_MS = 60_000;
const LIMIT = 30;
const MAX_INCIDENTS = 100;

function clientKey(req) {
  const forwarded = req.headers?.["x-forwarded-for"] || req.headers?.["x-real-ip"] || "unknown";
  return String(forwarded).split(",")[0].trim().slice(0, 80) || "unknown";
}

function record(type, severity = "info", details = {}) {
  const event = { type, severity, timestamp: new Date().toISOString(), details };
  incidents.unshift(event);
  if (incidents.length > MAX_INCIDENTS) incidents.pop();
  return event;
}

export function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
}

export function wall(req, { limit = LIMIT } = {}) {
  const key = clientKey(req);
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || now - existing.startedAt >= WINDOW_MS) {
    buckets.set(key, { startedAt: now, count: 1 });
    return { allowed: true, remaining: limit - 1 };
  }
  existing.count += 1;
  if (existing.count > limit) {
    record("rate_limit_block", "high", { window: "60s" });
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: limit - existing.count };
}

export function eyeSnapshot() {
  const recent = incidents.filter(e => Date.now() - Date.parse(e.timestamp) < 24 * 60 * 60 * 1000);
  return {
    status: "operational",
    guards: {
      WALL: "active",
      EYE: "active",
      GHOST: "standby"
    },
    last24h: {
      incidents: recent.length,
      highSeverity: recent.filter(e => e.severity === "high" || e.severity === "critical").length
    },
    recentEvents: recent.slice(0, 20).map(({ type, severity, timestamp }) => ({ type, severity, timestamp })),
    note: "Vercel serverless memory is instance-local; durable security analytics require a shared log store."
  };
}

export function eyeEvent(type, severity, details = {}) {
  return record(type, severity, details);
}

export function ghostStatus() {
  return {
    status: "standby",
    mode: "safe-on-demand",
    checks: ["security headers", "API method validation", "input length limits", "rate-limit configuration"],
    note: "No destructive or unauthorized penetration testing is performed automatically."
  };
}
