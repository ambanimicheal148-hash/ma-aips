import { securityHeaders, wall, eyeEvent } from "../lib/security.js";

export default function handler(req, res) {
  securityHeaders(res);
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const gate = wall(req, { limit: 60 });
  res.setHeader("X-RateLimit-Remaining", String(gate.remaining));
  if (!gate.allowed) {
    eyeEvent("student_rate_limit", "high");
    return res.status(429).json({ error: "Too many requests.", guard: "WALL" });
  }

  const studentId = String(req.query?.student_id || req.query?.id || "").trim().slice(0, 100);
  if (!studentId) return res.status(400).json({ error: "student_id is required." });

  const student = {
    student_id: studentId,
    name: studentId.toUpperCase() === "TEST123" ? "Test Student" : "Student",
    course: "General Studies",
    status: "active"
  };

  eyeEvent("student_lookup", "info");
  return res.status(200).json({ success: true, student });
}
