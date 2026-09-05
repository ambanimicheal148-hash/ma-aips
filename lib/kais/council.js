// K.AI.S Council Engine — Phase 1 staging integration.
// This layer is intentionally deterministic and provider-agnostic.
// It gates requests before the existing MA-AIPS AI provider is called.

const SAFETY_BLOCKS = [
  "make a bomb",
  "build a bomb",
  "make explosives",
  "how to poison",
  "make poison",
  "how to hack",
  "create malware"
];

export function runCouncilGate({ message = "" } = {}) {
  const text = String(message).trim().toLowerCase();

  if (!text) {
    return { status: "BLOCK", reason: "empty_request", legal: "PASS", finance: "PASS", babel: "PASS" };
  }

  if (SAFETY_BLOCKS.some(term => text.includes(term))) {
    return { status: "BLOCK", reason: "safety_policy", legal: "PASS", finance: "PASS", babel: "PASS" };
  }

  // Phase 1: council gate only. No autonomous external action or
  // production mutation is performed here.
  return { status: "PASS", reason: "approved_for_ai", legal: "PASS", finance: "PASS", babel: "PASS" };
}
