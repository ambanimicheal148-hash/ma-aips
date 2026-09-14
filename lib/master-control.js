import crypto from "node:crypto";

const DEFAULT_TIMEOUT_MS = Number(process.env.MASTER_AI_TASK_TIMEOUT_MS || 30000);
const MAX_LEDGER_ITEMS = 200;

function config() {
  const url = String(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "").replace(/\/$/, "");
  const token = String(process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "");
  return { url, token };
}

async function command(command) {
  const { url, token } = config();
  if (!url || !token) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ command })
  });
  if (!response.ok) throw new Error(`Master control store failed: ${response.status}`);
  const data = await response.json();
  return data?.result ?? null;
}

const key = "ma_aips:master_control:ledger";

export const INSTRUCTION_HIERARCHY = Object.freeze({ CEO: 5, MASTER_AI: 4, COUNCIL: 3, SPECIALIST: 2, SYSTEM: 1 });

export function assertAuthority(actor = "MASTER_AI", requestedLevel = "SPECIALIST") {
  const actorRank = INSTRUCTION_HIERARCHY[String(actor).toUpperCase()] || 0;
  const requestedRank = INSTRUCTION_HIERARCHY[String(requestedLevel).toUpperCase()] || 0;
  if (actorRank < requestedRank) throw new Error(`Authority violation: ${actor} cannot override ${requestedLevel}`);
  return true;
}

export function createTask({ message, owner, deadlineMs = DEFAULT_TIMEOUT_MS, actor = "MASTER_AI" } = {}) {
  assertAuthority(actor, "SPECIALIST");
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    deadlineAt: new Date(Date.now() + Math.max(1000, Number(deadlineMs) || DEFAULT_TIMEOUT_MS)).toISOString(),
    owner: String(owner || "CORE"),
    state: "OPEN",
    message: String(message || "").slice(0, 4000)
  };
}

export async function recordTask(task, state, extra = {}) {
  const record = { ...task, ...extra, state: String(state), updatedAt: new Date().toISOString() };
  try {
    await command(["LPUSH", key, JSON.stringify(record)]);
    await command(["LTRIM", key, "0", String(MAX_LEDGER_ITEMS - 1)]);
  } catch (error) {
    console.error("Master control ledger write failed:", error?.message || error);
  }
  return record;
}

export function isExpired(task) {
  return Boolean(task?.deadlineAt && Date.now() > Date.parse(task.deadlineAt));
}

export async function runControlledTask({ message, owner, timeoutMs = DEFAULT_TIMEOUT_MS, execute }) {
  const task = createTask({ message, owner, deadlineMs: timeoutMs });
  await recordTask(task, "OPEN");
  await recordTask(task, "IN_PROGRESS");
  const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("MASTER_AI_TASK_TIMEOUT")), Math.max(1000, timeoutMs)));
  try {
    const result = await Promise.race([Promise.resolve().then(execute), timeout]);
    await recordTask(task, "VERIFIED", { verification: "execution_returned_successfully" });
    return { result, task: { ...task, state: "VERIFIED" } };
  } catch (error) {
    const state = error?.message === "MASTER_AI_TASK_TIMEOUT" ? "EXPIRED" : "FAILED";
    await recordTask(task, state, { error: error?.message || String(error) });
    throw error;
  }
}

export async function recordCommitment({ owner = "MASTER_AI", promise, deadlineAt = null, status = "OPEN", actor = "MASTER_AI" } = {}) {
  assertAuthority(actor, "SPECIALIST");
  return recordTask({ id: `commitment-${crypto.randomUUID()}`, createdAt: new Date().toISOString(), deadlineAt, owner, message: String(promise || "").slice(0, 4000) }, status, { kind: "COMMITMENT" });
}
