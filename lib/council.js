// K.AI.S Council Engine — Phase 1
// Deterministic routing only. No persistence, external actions, or production mutation.

export const COUNCIL_EMPLOYEES = Object.freeze([
  "CORE",
  "BABEL",
  "ARCHITECT",
  "PIPELINE",
  "GROWTH",
  "DESIGNER",
  "LEGAL",
  "FINANCE",
  "QA",
  "CEO ADVISOR"
]);

const ROUTES = [
  ["LEGAL", [/privacy policy/i, /privacy/i, /legal/i, /compliance/i, /terms of service/i, /regulation/i, /law/i]],
  ["FINANCE", [/cost/i, /price/i, /pricing/i, /budget/i, /finance/i, /financial/i, /revenue/i, /funding/i, /pilot.*cost/i]],
  ["BABEL", [/translate/i, /translation/i, /kiswahili/i, /swahili/i, /sheng/i, /dholuo/i, /language/i]],
  ["ARCHITECT", [/architect/i, /architecture/i, /system design/i, /design.*system/i, /database schema/i, /api design/i, /technical design/i]],
  ["PIPELINE", [/pipeline/i, /workflow/i, /deploy/i, /deployment/i, /integration/i, /automation/i, /ci\/cd/i]],
  ["GROWTH", [/grow/i, /growth/i, /marketing/i, /customer/i, /sales/i, /market/i, /business growth/i, /acquisition/i]],
  ["DESIGNER", [/ui/i, /ux/i, /interface/i, /layout/i, /branding/i, /visual design/i, /user experience/i]],
  ["QA", [/test/i, /testing/i, /bug/i, /debug/i, /quality/i, /regression/i, /verify/i, /audit/i]],
  ["CEO ADVISOR", [/strategy/i, /strategic/i, /executive/i, /ceo/i, /decision/i, /priorit/i, /roadmap/i]]
];

const SAFETY_BLOCKS = [
  /make a bomb/i,
  /build a bomb/i,
  /make explosives/i,
  /how to poison/i,
  /make poison/i,
  /how to hack/i,
  /create malware/i
];

export function routeToEmployee(message = "") {
  const text = String(message).trim();
  if (!text) return "CORE";

  for (const [employee, patterns] of ROUTES) {
    if (patterns.some(pattern => pattern.test(text))) return employee;
  }
  return "CORE";
}

export function runCouncilGate({ message = "" } = {}) {
  const text = String(message).trim();

  if (!text) {
    return {
      status: "BLOCK",
      reason: "empty_request",
      routedTo: "CORE",
      legal: "PASS",
      finance: "PASS",
      babel: "PASS"
    };
  }

  if (SAFETY_BLOCKS.some(pattern => pattern.test(text))) {
    return {
      status: "BLOCK",
      reason: "safety_policy",
      routedTo: "CORE",
      legal: "PASS",
      finance: "PASS",
      babel: "PASS"
    };
  }

  return {
    status: "PASS",
    reason: "approved_for_routing",
    routedTo: routeToEmployee(text),
    legal: "PASS",
    finance: "PASS",
    babel: "PASS"
  };
}

export function councilRoute(message = "") {
  const council = runCouncilGate({ message });
  return {
    ...council,
    approvalRequired: council.routedTo === "LEGAL" || council.routedTo === "FINANCE"
  };
}
