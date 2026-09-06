import { securityHeaders, eyeSnapshot, ghostStatus } from "../lib/security.js";

export default function handler(req, res) {
  securityHeaders(res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const mode = String(req.query?.guard || "all").toLowerCase();
  if (mode === "ghost") return res.status(200).json(ghostStatus());
  return res.status(200).json({
    service: "K.AI.S Cyber Defense Division",
    motto: "No Sleep. No Breach. No Data Lost.",
    ...eyeSnapshot()
  });
}
