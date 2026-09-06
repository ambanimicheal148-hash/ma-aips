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
    const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
    const language = typeof body.language === "string" ? body.language.trim().slice(0, 40) : "English";

    if (!message) return res.status(400).json({ error: "Message required" });
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(413).json({ error: "Message too long" });
    }

    // student_id is intentionally not read or persisted here. The MASTER route
    // is a privacy boundary; student-specific context remains on /api/chat.
    const council = councilRoute(message);

    if (council.status === "BLOCK") {
      return res.status(400).json({
        routedTo: council.routedTo,
        employee: council.routedTo,
        approvalRequired: false,
        council,
        reply: "I cannot help with that request."
      });
    }

    let reply = null;
    let providerError = null;

    try {
      reply = await generateAIReply({
        message,
        history,
        language,
        councilRole: council.routedTo
      });
    } catch (error) {
      providerError = error instanceof Error ? error.message : "AI provider request failed";
    }

    if (providerError) {
      return res.status(503).json({
        routedTo: council.routedTo,
        employee: council.routedTo,
        approvalRequired: council.approvalRequired,
        council,
        error: "AI provider unavailable",
        detail: providerError
      });
    }

    return res.status(200).json({
      routedTo: council.routedTo,
      employee: council.routedTo,
      approvalRequired: council.approvalRequired,
      council,
      reply,
      language
    });
  } catch (error) {
    console.error("K.AI.S MASTER ERROR:", error);
    return res.status(500).json({ error: "K.AI.S MASTER error" });
  }
}
