import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const API_ROUTES = {
  "/api/health": "./api/health.js",
  "/api/student": "./api/student.js",
  "/api/chat": "./api/chat.js",
  "/api/kais/chat": "./api/kais/chat.js",
  "/api/master": "./api/master.js",
  "/api/sai-c/network": "./api/sai-c/network.js",
  "/api/mbna/program": "./api/mbna/program.js",
  "/api/whatsapp/status": "./api/whatsapp/status.js",
  "/api/whatsapp/qr": "./api/whatsapp/qr.js",
  "/api/studio": "./api/studio.js",
  "/api/studio/track": "./api/studio-track.js",
  "/api/closed-loop-proof": "./api/closed-loop-proof.js"
};

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".mp3": "audio/mpeg", ".wav": "audio/wav"
};

const MAX_BODY_BYTES = Number(process.env.MAAIPS_MAX_BODY_BYTES || 262144);
const MAX_API_INFLIGHT = Number(process.env.MAAIPS_MAX_API_INFLIGHT || 256);
const MAX_EXPENSIVE_INFLIGHT = Number(process.env.MAAIPS_MAX_EXPENSIVE_INFLIGHT || 64);
const MAX_API_CONNECTIONS = Number(process.env.MAAIPS_MAX_API_CONNECTIONS || 4000);
const REQUEST_TIMEOUT_MS = Number(process.env.MAAIPS_REQUEST_TIMEOUT_MS || 30000);
const EXPENSIVE_ROUTES = new Set(["/api/chat","/api/kais/chat","/api/master","/api/studio","/api/studio/track","/api/closed-loop-proof"]);

let apiInflight = 0;
let expensiveInflight = 0;
let accepted = 0;
let shed = 0;

const ipWindows = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = Number(process.env.MAAIPS_API_RATE_PER_MINUTE || 120);

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("X-MAAIPS-Replica", process.env.RAILWAY_REPLICA_ID || "local");
  res.setHeader("X-MAAIPS-Region", process.env.RAILWAY_REPLICA_REGION || "local");
}

function makeResponse(res) {
  return {
    status(code) { res.statusCode = code; return this; },
    setHeader(name, value) { res.setHeader(name, value); },
    json(payload) { if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(payload)); },
    end(payload = "") { res.end(payload); }
  };
}

async function parseBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      req.destroy();
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); } catch { throw new Error("INVALID_JSON"); }
}

function clientKey(req) {
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwarded || req.socket.remoteAddress || "unknown";
}

function allowRequest(req, pathname) {
  if (pathname === "/api/health") return { ok: true };
  const now = Date.now();
  const key = clientKey(req);
  let entry = ipWindows.get(key);
  if (!entry || now - entry.startedAt >= RATE_WINDOW_MS) {
    entry = { startedAt: now, count: 0 };
    ipWindows.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT) return { ok: false, code: 429, reason: "CLIENT_RATE_LIMIT" };

  const expensive = EXPENSIVE_ROUTES.has(pathname);
  if (expensive && expensiveInflight >= MAX_EXPENSIVE_INFLIGHT) return { ok: false, code: 503, reason: "EXPENSIVE_WORK_SATURATED" };
  if (!expensive && apiInflight >= MAX_API_INFLIGHT) return { ok: false, code: 503, reason: "API_CAPACITY_REACHED" };
  if (apiInflight >= MAX_API_CONNECTIONS) return { ok: false, code: 503, reason: "API_CONNECTION_CAPACITY_REACHED" };
  return { ok: true, expensive };
}

function beginRequest(expensive) {
  apiInflight += 1;
  if (expensive) expensiveInflight += 1;
  accepted += 1;
  return () => {
    apiInflight = Math.max(0, apiInflight - 1);
    if (expensive) expensiveInflight = Math.max(0, expensiveInflight - 1);
  };
}

async function runApi(req, res, url) {
  const modulePath = API_ROUTES[url.pathname];
  if (!modulePath) return false;

  const gate = allowRequest(req, url.pathname);
  if (!gate.ok) {
    shed += 1;
    applySecurityHeaders(res);
    res.statusCode = gate.code;
    res.setHeader("Retry-After", gate.code === 429 ? "60" : "2");
    res.setHeader("X-MAAIPS-Load-Mode", "LOAD_SHEDDING");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({
      ok: false,
      error: gate.reason,
      load_mode: "LOAD_SHEDDING",
      retry_after_seconds: gate.code === 429 ? 60 : 2
    }));
    return true;
  }

  const release = beginRequest(Boolean(gate.expensive));
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      res.statusCode = 504;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ ok: false, error: "REQUEST_TIMEOUT", load_mode: "PROTECTED" }));
    }
    req.destroy();
  });

  try {
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = await parseBody(req);
    const mod = await import(pathToFileURL(path.resolve(__dirname, modulePath)).href);
    if (typeof mod.default !== "function") throw new Error("API_HANDLER_INVALID");
    await mod.default(req, makeResponse(res));
  } catch (error) {
    console.error("API error:", error);
    if (!res.headersSent) {
      res.statusCode = error?.message === "INVALID_JSON" ? 400 : error?.message === "REQUEST_BODY_TOO_LARGE" ? 413 : 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: error?.message === "INVALID_JSON" ? "Invalid JSON body" : error?.message === "REQUEST_BODY_TOO_LARGE" ? "Request body too large" : "MA-AIPS server error" }));
    }
  } finally {
    release();
  }
  return true;
}

async function serveStatic(req, res, url) {
  let requestPath = decodeURIComponent(url.pathname);
  if (requestPath === "/") requestPath = "/index.html";
  if (requestPath.includes("..")) { res.statusCode = 400; res.end("Bad request"); return; }
  const candidates = [path.join(__dirname, requestPath), path.join(__dirname, "public", requestPath)];
  for (const filePath of candidates) {
    try {
      const stat = await fs.stat(filePath); if (!stat.isFile()) continue;
      const data = await fs.readFile(filePath); res.statusCode = 200;
      res.setHeader("Content-Type", MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
      res.setHeader("Cache-Control", requestPath === "/index.html" ? "no-cache" : "public, max-age=3600, stale-while-revalidate=86400");
      res.end(data); return;
    } catch {}
  }
  res.statusCode = 404; res.setHeader("Content-Type", "text/plain; charset=utf-8"); res.end("Not found");
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (await runApi(req, res, url)) return;
    if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("Allow", "GET, HEAD, POST"); return res.end("Method not allowed"); }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error("Server error:", error);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Server error");
  }
});

server.requestTimeout = REQUEST_TIMEOUT_MS;
server.headersTimeout = Math.min(REQUEST_TIMEOUT_MS, 15000);
server.keepAliveTimeout = 5000;
server.maxConnections = MAX_API_CONNECTIONS;

setInterval(() => {
  const cutoff = Date.now() - (RATE_WINDOW_MS * 2);
  for (const [key, value] of ipWindows) if (value.startedAt < cutoff) ipWindows.delete(key);
}, RATE_WINDOW_MS).unref();

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`MA-AIPS Railway server listening on port ${PORT} replica=${process.env.RAILWAY_REPLICA_ID || "local"} region=${process.env.RAILWAY_REPLICA_REGION || "local"}`);
  console.log(`capacity api_inflight=${MAX_API_INFLIGHT} expensive_inflight=${MAX_EXPENSIVE_INFLIGHT} rate_per_minute=${RATE_LIMIT}`);
  const whatsappMode = String(process.env.WHATSAPP_MODE || "baileys").trim().toLowerCase();
  const whatsappAuthDir = String(process.env.WHATSAPP_AUTH_DIR || "").trim();
  const whatsappPrimary = String(process.env.WHATSAPP_BRIDGE_PRIMARY || "false").trim().toLowerCase() === "true";
  console.log(`WhatsApp bridge config: mode=${whatsappMode || "unset"}, authDir=${whatsappAuthDir || "unset"}, primary=${whatsappPrimary}`);
  // API replicas are stateless. The stateful WhatsApp bridge must run as a dedicated worker,
  // never once per API replica, otherwise a scale-out can create competing sessions and delay health.
  if (whatsappPrimary && (whatsappMode === "baileys" || whatsappAuthDir)) {
    try {
      const { startWhatsApp } = await import("./lib/whatsapp.js");
      await startWhatsApp();
      console.log("WhatsApp bridge initialization requested on dedicated primary");
    } catch (error) {
      console.error("WhatsApp bridge failed to start:", error);
    }
  } else {
    console.log("WhatsApp bridge not started in this API replica");
  }
});

process.on("SIGTERM", () => {
  console.log(`MA-AIPS graceful shutdown requested replica=${process.env.RAILWAY_REPLICA_ID || "local"} inflight=${apiInflight}`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 25000).unref();
});
