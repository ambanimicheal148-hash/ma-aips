import { generateAIReply } from "../../lib/ai.js";
import { securityHeaders, wall, eyeEvent } from "../../lib/security.js";

export default async function handler(req, res) {
  securityHeaders(res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const gate = wall(req);
  res.setHeader("X-RateLimit-Remaining", String(gate.remaining));
  if (!gate.allowed) {
    eyeEvent("kais_rate_limit", "high");
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim().slice(0, 4000) : "";
    const language = typeof body.language === "string" ? body.language.slice(0, 40) : "en";
    const sessionId = typeof body.session_id === "string" ? body.session_id.slice(0, 100) : "GUEST";

    if (!message) return res.status(400).json({ error: "Message required" });

    const result = await generateAIReply({ message, history: [], language, studentId: sessionId });
    const reply = typeof result === "string" ? result : (result?.text || result?.reply || "No response received.");
    if (!reply.trim()) throw new Error("AI provider returned an empty response");

    return res.status(200).json({
      success: true,
      reply,
      disclaimer: "K.AI.S is independent technology, not a Government of Kenya service. Verify official requirements on eCitizen/Huduma/KRA.",
      sources: result?.sources || []
    });
  } catch (error) {
    console.error("K.AI.S route error:", error);
    eyeEvent("kais_error", "high", { message: error?.message || "unknown" });
    return res.status(500).json({ error: "K.AI.S error: AI service request failed." });
  }
}
