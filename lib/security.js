const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const MAX_INCIDENTS = 100;
const buckets = new Map();
const incidents = [];

// v220+: Security Army expanded by 4 seats per child.
// 3 Triad seats + 4 specialist security seats = 7 security AIs per child.
export const SECURITY_ARMY = Object.freeze([
  { id: "PREVENT", mission: "Prevent unsafe access, policy violations and avoidable attack paths.", scope: "internal+external" },
  { id: "DETECT", mission: "Detect anomalous behavior, abuse patterns, prompt injection and intrusion signals.", scope: "internal+external" },
  { id: "RESPOND", mission: "Contain and recover from confirmed or suspected security incidents.", scope: "internal+external" },
  { id: "THREAT_INTELLIGENCE", mission: "Correlate threat indicators and emerging attack patterns without conducting unauthorized offensive testing.", scope: "external" },
  { id: "IDENTITY_DEFENSE", mission: "Protect authentication, authorization, session integrity and privileged actions.", scope: "internal+external" },
  { id: "PROMPT_GUARDIAN", mission: "Detect prompt injection, instruction-conflict attacks and unsafe tool-use attempts.", scope: "internal+external" },
  { id: "FRAUD_ABUSE", mission: "Detect payment abuse, account abuse, automated misuse and suspicious transaction patterns.", scope: "internal+external" }
]);

export const SECURITY_ARMY_COUNT = SECURITY_ARMY.length;

function clientKey(req) {
  const forwarded = req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "unknown";
  return String(forwarded).split(",")[0].trim().slice(0, 100) || "unknown";
}

function record(type, severity = "info", details = {}) {
  const safeDetails = {};
  for (const [key, value] of Object.entries(details || {})) {
    if (/key|token|secret|password|authorization/i.test(key)) continue;
    safeDetails[key] = typeof value === "string" ? value.slice(0, 300) : value;
  }
  const event = { type: String(type).slice(0, 100), severity: String(severity).slice(0, 30), timestamp: new Date().toISOString(), details: safeDetails };
  incidents.unshift(event);
  if (incidents.length > MAX_INCIDENTS) incidents.pop();
  console.log(JSON.stringify({ service: "MA.AI.PS", ...event }));
  return event;
}

export function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
}

export function wall(req, { limit = MAX_REQUESTS } = {}) {
  const now = Date.now();
  const key = clientKey(req);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    record("rate_limit_block", "high", { window: "60s" });
    return { allowed: false, remaining: 0 };
  }
  if (buckets.size > 2000) {
    for (const [storedKey, stored] of buckets) {
      if (now - stored.startedAt >= WINDOW_MS) buckets.delete(storedKey);
    }
  }
  return { allowed: true, remaining: Math.max(0, limit - bucket.count) };
}

export function eyeSnapshot() {
  const recent = incidents.filter(e => Date.now() - Date.parse(e.timestamp) < 24 * 60 * 60 * 1000);
  return {
    status: "operational",
    securityArmy: {
      count: SECURITY_ARMY_COUNT,
      units: SECURITY_ARMY.map(({ id, scope }) => ({ id, scope })),
      coverage: ["internal", "external"]
    },
    guards: { WALL: "active", EYE: "active", GHOST: "standby" },
    last24h: {
      incidents: recent.length,
      highSeverity: recent.filter(e => e.severity === "high" || e.severity === "critical").length
    },
    recentEvents: recent.slice(0, 20).map(({ type, severity, timestamp }) => ({ type, severity, timestamp })),
    note: "Instance-local incident memory; durable security analytics require a shared log store."
  };
}

export function eyeEvent(type, severity = "info", details = {}) {
  return record(type, severity, details);
}

export function ghostStatus() {
  return {
    status: "standby",
    mode: "safe-on-demand",
    checks: [
      "security headers",
      "API method validation",
      "input length limits",
      "rate-limit configuration",
      "identity/authorization integrity",
      "prompt-injection detection",
      "fraud/abuse signals",
      "external threat indicators"
    ],
    note: "No destructive or unauthorized penetration testing is performed automatically."
  };
}
