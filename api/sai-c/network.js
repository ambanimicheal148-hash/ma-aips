import { commanderSnapshot, canCommandAll } from "../lib/commander.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!canCommandAll("S_AI_C")) return res.status(403).json({ error: "Commander access denied" });
  return res.status(200).json(commanderSnapshot());
}
