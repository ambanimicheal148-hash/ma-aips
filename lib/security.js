const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;
const buckets = new Map();

function clientKey(req) {
  const forwarded = req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "unknown";
  return String(forwarded).split(",")[0].trim().slice(0, 100) || "unknown";
}

export function securityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

export function wall(req) {
  const now = Date.now();
  const key = clientKey(req);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.startedAt >= WINDOW_MS) {
    bucket = { startedAt: now, count: 0 };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (buckets.size > 2000) {
    for (const [storedKey, stored] of buckets) {
      if (now - stored.startedAt >= WINDOW_MS) buckets.delete(storedKey);
    }
  }
  return { allowed: bucket.count <= MAX_REQUESTS, remaining: Math.max(0, MAX_REQUESTS - bucket.count) };
}

export function eyeEvent(event, severity = "info", metadata = {}) {
  const safe = {};
  for (const [key, value] of Object.entries(metadata || {})) {
    if (/key|token|secret|password|authorization/i.test(key)) continue;
    safe[key] = typeof value === "string" ? value.slice(0, 300) : value;
  }
  console.log(JSON.stringify({ service: "K.A.I.S", event: String(event).slice(0, 100), severity: String(severity).slice(0, 30), timestamp: new Date().toISOString(), ...safe }));
}
