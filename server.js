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
  "/api/ask": "./api/ask.js",
  "/api/dashboard": "./api/dashboard.js",
  "/api/kais-ai": "./api/kais-ai.js",
  "/api/mbna": "./api/mbna.js",
  "/api/mcb-ai": "./api/mcb-ai.js",
  "/api/pipeline-ingest": "./api/pipeline-ingest.js"
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon"
};

function applySecurityHeaders(res) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
}

function makeResponse(res) {
  return {
    status(code) { res.statusCode = code; return this; },
    setHeader(name, value) { res.setHeader(name, value); },
    json(payload) {
      if (!res.headersSent) res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify(payload));
    },
    end(payload = "") { res.end(payload); }
  };
}

async function parseBody(req) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error("Request body too large");
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  try { return JSON.parse(raw); }
  catch { return {}; }
}

async function runApi(req, res, url) {
  const modulePath = API_ROUTES[url.pathname];
  if (!modulePath) return false;
  try {
    req.query = Object.fromEntries(url.searchParams.entries());
    req.body = await parseBody(req);
    const mod = await import(pathToFileURL(path.resolve(__dirname, modulePath)).href);
    const handler = mod.default;
    if (typeof handler !== "function") throw new Error("API handler is invalid");
    await handler(req, makeResponse(res));
  } catch (error) {
    console.error("API error:", error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ error: "MA-AIPS server error" }));
    }
  }
  return true;
}

async function serveStatic(req, res, url) {
  let requestPath = decodeURIComponent(url.pathname);
  if (requestPath === "/") requestPath = "/index.html";
  if (requestPath.includes("..")) {
    res.statusCode = 400;
    res.end("Bad request");
    return;
  }

  const candidates = [
    path.join(__dirname, requestPath),
    path.join(__dirname, "public", requestPath)
  ];

  for (const filePath of candidates) {
    try {
      const stat = await fs.stat(filePath);
      if (!stat.isFile()) continue;
      const data = await fs.readFile(filePath);
      res.statusCode = 200;
      res.setHeader("Content-Type", MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream");
      res.setHeader("Cache-Control", requestPath === "/index.html" ? "no-cache" : "public, max-age=300");
      res.end(data);
      return;
    } catch {}
  }

  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
}

const server = http.createServer(async (req, res) => {
  applySecurityHeaders(res);
  try {
    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    if (await runApi(req, res, url)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.statusCode = 405;
      res.setHeader("Allow", "GET, HEAD, POST");
      return res.end("Method not allowed");
    }
    await serveStatic(req, res, url);
  } catch (error) {
    console.error("Server error:", error);
    if (!res.headersSent) res.statusCode = 500;
    res.end("Server error");
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MA-AIPS Railway server listening on port ${PORT}`);
});
