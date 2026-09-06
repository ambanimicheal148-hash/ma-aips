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
    eyeEvent("mbna_rate_limit", "high");
    return res.status(429).json({ error: "Too many requests. Please try again shortly." });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const niche = typeof body.niche === "string" ? body.niche.trim().slice(0, 200) : "";
    const goal = typeof body.goal === "string" ? body.goal.trim().slice(0, 300) : "";
    const days = Math.min(30, Math.max(1, Number.parseInt(body.days, 10) || 21));

    if (!niche || !goal) return res.status(400).json({ success: false, error: "Niche and goal are required" });

    const prompt = `Create a practical ${days}-day growth program for this niche: ${niche}. Goal: ${goal}. Return concise JSON with keys title, goal, days. days must be an array of exactly ${days} objects, each with day, lesson, action.`;
    const result = await generateAIReply({ message: prompt, history: [], language: "English", studentId: "MBNA" });
    const text = typeof result === "string" ? result : (result?.text || result?.reply || "");

    let program;
    try {
      const cleaned = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
      program = JSON.parse(cleaned);
    } catch {
      program = {
        title: `${days}-Day ${niche} Growth Program`,
        goal,
        days: Array.from({ length: days }, (_, i) => ({ day: i + 1, lesson: "Learn and improve one core skill.", action: "Complete one practical action toward the stated goal." }))
      };
    }

    return res.status(200).json({ success: true, program });
  } catch (error) {
    console.error("MBNA route error:", error);
    eyeEvent("mbna_error", "high", { message: error?.message || "unknown" });
    return res.status(500).json({ success: false, error: "MBNA error: AI service request failed." });
  }
}
