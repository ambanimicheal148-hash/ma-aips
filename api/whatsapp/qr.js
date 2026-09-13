import { getWhatsAppStatus } from "../../lib/whatsapp.js";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const state = getWhatsAppStatus();
  if (!state.qr) return res.status(404).json({ status: state.status, message: "QR code is not currently available" });
  const base64 = state.qr.split(",")[1];
  res.setHeader("Content-Type", "image/png");
  return res.end(Buffer.from(base64, "base64"));
}
