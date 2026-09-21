import QRCode from "qrcode";
import pino from "pino";
import fs from "node:fs/promises";
import path from "node:path";
import { webcrypto } from "node:crypto";

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || (process.env.RAILWAY_VOLUME_MOUNT_PATH
  ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "whatsapp-auth")
  : path.resolve(process.cwd(), "data", "whatsapp-auth"));
let sock = null;
let qrDataUrl = null;
let status = "starting";
let lastError = null;
let starting = false;
let baileys = null;
let generateAIReply = null;

async function loadDependencies() {
  try {
    try {
      baileys = await import("@whiskeysockets/baileys");
      console.log("WhatsApp Baileys dependency loaded");
    } catch (error) {
      lastError = `Baileys import failed: ${error?.stack || error?.message || String(error)}`;
      console.error(lastError);
      return false;
    }
    try {
      const ai = await import("./ai.js");
      generateAIReply = ai.generateAIReply;
      console.log("WhatsApp AI dependency loaded");
    } catch (error) {
      lastError = `AI dependency import failed: ${error?.stack || error?.message || String(error)}`;
      console.error(lastError);
      return false;
    }
    return true;
  } catch (error) {
    lastError = error?.stack || error?.message || String(error);
    console.error("WhatsApp dependency load failed:", lastError);
    return false;
  }
}

async function ensureAuthDir() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
}

export function getWhatsAppStatus() {
  return {
    status,
    qr: qrDataUrl,
    lastError,
    authPersistent: Boolean(process.env.RAILWAY_VOLUME_MOUNT_PATH || process.env.WHATSAPP_AUTH_DIR)
  };
}

export async function startWhatsApp() {
  if (starting || (sock && status === "connected")) return;
  starting = true;
  try {
    if (!(await loadDependencies())) {
      status = "error";
      throw new Error(lastError || "WhatsApp dependencies failed to load");
    }
    const makeWASocket = baileys.default || baileys.makeWASocket;
    const { DisconnectReason, useMultiFileAuthState } = baileys;
    if (typeof makeWASocket !== "function") throw new Error("Baileys socket factory is unavailable");
    if (typeof generateAIReply !== "function") throw new Error("AI reply function is unavailable");
    await ensureAuthDir();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const logger = pino({ level: "warn" });
    sock = makeWASocket({
      auth: state,
      logger,
      browser: ["MA.AI.PS MASTER AI", "Chrome", "1.0.0"],
      markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
        status = "qr_ready";
        console.log("WhatsApp QR ready");
      }
      if (connection === "open") {
        status = "connected";
        qrDataUrl = null;
        lastError = null;
        console.log("WhatsApp connected");
      }
      if (connection === "close") {
        sock = null;
        const code = lastDisconnect?.error?.output?.statusCode;
        status = "disconnected";
        if (code !== DisconnectReason.loggedOut) {
          setTimeout(() => startWhatsApp().catch(console.error), 5000);
        }
      }
    });

    sock.ev.on("messages.upsert", async ({ messages }) => {
      for (const message of messages || []) {
        if (!message?.message || message.key.fromMe) continue;
        const jid = message.key.remoteJid;
        if (!jid || jid.endsWith("@g.us")) continue;
        const text = message.message.conversation || message.message.extendedTextMessage?.text || "";
        if (!text.trim()) continue;
        try {
          const result = await generateAIReply({ message: text.slice(0, 4000), history: [], language: "Auto", studentId: jid, councilRole: "W.A.I.S — WhatsApp AI Space" });
          const reply = typeof result === "string" ? result : (result?.text || result?.reply || "No response received.");
          await sock.sendMessage(jid, { text: reply });
        } catch (error) {
          console.error("WhatsApp AI reply error:", error);
        }
      }
    });
  } catch (error) {
    status = "error";
    lastError = error?.stack || error?.message || "WhatsApp startup failed";
    console.error("WhatsApp startup error:", lastError);
  } finally {
    starting = false;
  }
}

export async function sendWhatsAppMessage(jid, text) {
  if (!sock || status !== "connected") throw new Error("WhatsApp is not connected");
  return sock.sendMessage(jid, { text });
}
