import { generateAIReply } from "../lib/ai.js";
import { securityHeaders, wall, eyeEvent } from "../lib/security.js";

const MAX_MESSAGE = 4000;
const MAX_HISTORY = 12;
const BLOCKED = [
  "make a bomb", "build a bomb", "make explosives", "how to poison",
  "how to hack", "create malware", "make poison"
];

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
    eyeEvent("chat_rate_limit", "high");
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_MESSAGE) : "";
    const studentId = typeof body.student_id === "string" ? body.student_id.trim().slice(0, 100) : "GUEST";
    const history = Array.isArray(body.history) ? body.history.slice(-MAX_HISTORY) : [];
    const targetLang = typeof body.targetLanguage === "string" ? body.targetLanguage : "Auto";

    if (!message) return res.status(400).json({ error: "Message required" });

    const lower = message.toLowerCase();
    if (BLOCKED.some(term => lower.includes(term))) {
      eyeEvent("unsafe_request_blocked", "high", { studentId });
      return res.status(200).json({
        reply: "I cannot help with weapons, explosives, poisoning, hacking, or malware. I am K.AI.S, your safe academic helper.",
        safetyBlocked: true,
        sources: [],
        language: "English"
      });
    }

    const isSwahili = /(nataka|habari|asante|homa|mkopo|kikohozi|shamba)/i.test(message);
    const language = targetLang === "Auto" ? (isSwahili ? "Kiswahili" : "English") : targetLang.slice(0, 40);
    const result = await generateAIReply({ message, history, language, studentId });
    const reply = typeof result === "string" ? result : (result?.text || result?.reply || "No response received.");
    if (!reply.trim()) throw new Error("AI provider returned an empty response");

    return res.status(200).json({
      reply,
      sources: result?.sources || [],
      language,
      retrievalMode: result?.retrievalMode || "provider"
    });
  } catch (error) {
    console.error("K.AI.S chat error:", error);
    eyeEvent("chat_error", "high", { message: error?.message || "unknown" });
    return res.status(500).json({ error: "K.AI.S error: AI service request failed." });
  }
}
