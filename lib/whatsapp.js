import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import fs from "node:fs/promises";
import path from "node:path";
import { generateAIReply } from "./ai.js";

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || path.resolve(process.cwd(), ".whatsapp-auth");
let sock = null;
let qrDataUrl = null;
let status = "starting";
let lastError = null;
let starting = false;

async function ensureAuthDir() {
  await fs.mkdir(AUTH_DIR, { recursive: true });
}

export function getWhatsAppStatus() {
  return { status, qr: qrDataUrl, lastError };
}

export async function startWhatsApp() {
  if (starting || (sock && status === "connected")) return;
  starting = true;
  try {
    await ensureAuthDir();
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    sock = makeWASocket({
      auth: state,
      logger: pino({ level: "warn" }),
      browser: ["MA.AI.PS MASTER AI", "Chrome", "1.0.0"],
      markOnlineOnConnect: false
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", async ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        qrDataUrl = await QRCode.toDataURL(qr, { margin: 1, width: 360 });
        status = "qr_ready";
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
      const message = messages?.[0];
      if (!message?.message || message.key.fromMe) return;
      const jid = message.key.remoteJid;
      if (!jid || jid.endsWith("@g.us")) return;
      const text = message.message.conversation || message.message.extendedTextMessage?.text || "";
      if (!text.trim()) return;
      try {
        const result = await generateAIReply({
          message: text.slice(0, 4000),
          history: [],
          language: "Auto",
          studentId: jid
        });
        const reply = typeof result === "string" ? result : (result?.text || result?.reply || "No response received.");
        await sock.sendMessage(jid, { text: reply });
      } catch (error) {
        console.error("WhatsApp AI reply error:", error);
      }
    });
  } catch (error) {
    status = "error";
    lastError = error?.message || "WhatsApp startup failed";
    console.error("WhatsApp startup error:", error);
  } finally {
    starting = false;
  }
}

export async function sendWhatsAppMessage(jid, text) {
  if (!sock || status !== "connected") throw new Error("WhatsApp is not connected");
  return sock.sendMessage(jid, { text });
}
