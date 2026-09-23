// MA.AI.PS V343 — evidence contract.
// Evidence records are structured facts about an execution. They do not mark a task
// VERIFIED unless an explicit verifier has actually passed.

export const EVIDENCE_STATUSES = Object.freeze([
  "PLANNED", "BUILDING", "TESTING", "VERIFIED", "RELEASED",
  "FAILED", "ISOLATED", "FIXED", "RETESTED", "PENDING", "PARTIALLY COMPLETED", "REQUIRES HUMAN REVIEW"
]);

export function createEvidenceRecord(input = {}) {
  const status = String(input.status || "TESTING").toUpperCase();
  if (!EVIDENCE_STATUSES.includes(status)) throw new Error("Invalid evidence status: " + status);
  const required = {
    version: String(input.version || "V343"),
    taskId: String(input.taskId || ""),
    timestamp: input.timestamp || new Date().toISOString(),
    owner: String(input.owner || "S_AI_C"),
    input: input.input ?? null,
    expectedResult: input.expectedResult ?? null,
    actualResult: input.actualResult ?? null,
    status,
    latencyMs: Number.isFinite(Number(input.latencyMs)) ? Number(input.latencyMs) : null,
    model: input.model || null,
    provider: input.provider || null,
    tools: Array.isArray(input.tools) ? input.tools : [],
    outputFiles: Array.isArray(input.outputFiles) ? input.outputFiles : [],
    sources: Array.isArray(input.sources) ? input.sources : [],
    errors: Array.isArray(input.errors) ? input.errors : [],
    limitations: Array.isArray(input.limitations) ? input.limitations : [],
    verification: input.verification || null
  };
  if (!required.taskId) throw new Error("Evidence taskId is required");
  return Object.freeze(required);
}

export function canClaimVerified(record) {
  return Boolean(
    record &&
    record.status === "VERIFIED" &&
    record.verification &&
    record.verification.result === "PASS" &&
    record.verification.method
  );
}

export function truthBlock({ source, date, status, whatMAAIPSDid, whatUserMustVerify, limitations = [] } = {}) {
  const allowed = ["VERIFIED", "PARTIALLY VERIFIED", "INSUFFICIENT EVIDENCE"];
  const normalized = String(status || "").toUpperCase();
  if (!source || !date || !allowed.includes(normalized) || !whatMAAIPSDid || !whatUserMustVerify) {
    return { status: "INSUFFICIENT EVIDENCE", complete: false, source: source || null, date: date || null, whatMAAIPSDid: whatMAAIPSDid || null, whatUserMustVerify: whatUserMustVerify || null, limitations };
  }
  return { source, date, status: normalized, whatMAAIPSDid, whatUserMustVerify, limitations };
}
