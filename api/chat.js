import { generateAIReply } from "../lib/ai.js";
import { councilRoute } from "../lib/council.js";

const MAX_MESSAGE_LENGTH = 4000;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const studentId = typeof body.student_id === "string" ? body.student_id.trim().slice(0, 100) : "GUEST";
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const targetLang = typeof body.targetLanguage === "string" ? body.targetLanguage : "Auto";

    if (!message) return res.status(400).json({ error: "Message required" });
    if (message.length > MAX_MESSAGE_LENGTH) return res.status(413).json({ error: "Message too long" });

    const council = councilRoute(message);
    if (council.status === "BLOCK") {
      return res.status(400).json({
        reply: "I cannot help with weapons, explosives, poisoning, hacking, or malware. I am K.AI.S, your safe academic helper.",
        safetyBlocked: true,
        council,
        sources: []
      });
    }

    const isSwahili = (message.match(/nataka|habari|asante|homa|mkopo|kikohozi|shamba/gi) || []).length >= 1;
    const lang = targetLang === "Auto" ? (isSwahili ? "Kiswahili" : "English") : targetLang;

    const aiResult = await generateAIReply({
      message,
      history,
      language: lang,
      studentId,
      councilRole: council.routedTo
    });
    const reply = typeof aiResult === "string" ? aiResult : (aiResult?.text || aiResult?.reply || "No response received.");

    return res.json({
      reply,
      council,
      routedTo: council.routedTo,
      sources: typeof aiResult === "object" ? (aiResult.sources || []) : [],
      language: lang,
      retrievalMode: typeof aiResult === "object" ? (aiResult.retrievalMode || "provider") : "provider"
    });
  } catch (e) {
    console.error(e);
    return res.status(503).json({ error: "K.AI.S provider unavailable" });
  }
}
