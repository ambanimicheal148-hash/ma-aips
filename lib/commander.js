import { ALL_AI_DEPARTMENTS, ALL_SPECIALIST_DEPARTMENTS, DEPARTMENT_COUNTS } from "./departments.js";
import { SECURITY_ARMY } from "./security.js";

const CHILDREN = Object.freeze([
  { id: "K.AI.S", mission: "Kenya AI Space" },
  { id: "C.AI.S", mission: "Create AI Space" },
  { id: "W.A.I.S", mission: "WhatsApp AI Space" },
  { id: "DEUTSCHLAND_GATEWAY", mission: "Germany career and education assistance" }
]);

export const SAI_C_ACCESS = Object.freeze({
  commander: "S_AI_C",
  authority: "CEO-delegated command and observation",
  networkAccess: "ALL_AI_DEPARTMENTS",
  visibility: ["status", "routing", "department", "security", "child", "task", "verification"],
  controls: ["inspect", "route", "assign", "verify", "escalate", "contain"],
  safeguards: ["least-privilege tools", "security triad supremacy on threats", "no unauthorized offensive action"]
});

export function commanderSnapshot() {
  return {
    commander: "S_AI_C",
    status: "operational",
    access: SAI_C_ACCESS,
    network: {
      declaredPerChild: DEPARTMENT_COUNTS.networkPerChild,
      childProducts: DEPARTMENT_COUNTS.childProducts,
      ecosystemAI: DEPARTMENT_COUNTS.ecosystem,
      departments: ALL_AI_DEPARTMENTS.map(id => {
        const d = ALL_SPECIALIST_DEPARTMENTS.find(x => x.id === id);
        return d ? { id: d.id, parent: d.parent, mission: d.mission } : { id, parent: "COUNCIL", mission: "Council command node" };
      })
    },
    security: SECURITY_ARMY.map(({ id, mission, scope, tier }) => ({ id, mission, scope, tier })),
    children: CHILDREN
  };
}

export function canCommandAll(actor = "S_AI_C") {
  return String(actor).toUpperCase() === "S_AI_C";
}
