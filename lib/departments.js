export const SPECIALIST_DEPARTMENTS = Object.freeze([
  { id: "RESEARCH", parent: "CORE", mission: "Research, fact-checking, source comparison and evidence synthesis." },
  { id: "EDUCATION", parent: "CORE", mission: "Student guidance, curriculum support and learning plans." },
  { id: "KNOWLEDGE", parent: "CORE", mission: "Knowledge organization, retrieval and answer quality." },
  { id: "LANGUAGE_ENGINE", parent: "BABEL", mission: "Multilingual translation, localization and language quality." },
  { id: "VOICE_LANGUAGE", parent: "BABEL", mission: "Speech, pronunciation, voice interaction and language accessibility." },
  { id: "SOFTWARE_ENGINEERING", parent: "ARCHITECT", mission: "Application engineering, implementation and maintainable code." },
  { id: "DEVOPS", parent: "ARCHITECT", mission: "Deployments, infrastructure, observability and reliability." },
  { id: "DATA_ENGINEERING", parent: "PIPELINE", mission: "Data ingestion, normalization, provenance and pipelines." },
  { id: "GOVERNMENT_INTELLIGENCE", parent: "PIPELINE", mission: "Verified public-sector information with provenance and freshness checks." },
  { id: "SALES", parent: "GROWTH", mission: "Lead handling, offers, conversion workflows and sales support." },
  { id: "CUSTOMER_SUCCESS", parent: "GROWTH", mission: "Customer onboarding, support escalation and retention." },
  { id: "MARKETING", parent: "GROWTH", mission: "Campaign strategy, copy, targeting and distribution." },
  { id: "PRODUCT", parent: "DESIGNER", mission: "Product experience, requirements and feature prioritization." },
  { id: "BRAND", parent: "DESIGNER", mission: "Brand identity, messaging and visual consistency." },
  { id: "PRIVACY", parent: "LEGAL", mission: "Privacy controls, data minimization and compliance review." },
  { id: "RISK", parent: "LEGAL", mission: "Operational risk assessment, safeguards and policy escalation." },
  { id: "ACCOUNTING", parent: "FINANCE", mission: "Financial records, costing and management reporting." },
  { id: "REVENUE_ANALYTICS", parent: "FINANCE", mission: "Revenue analysis, pricing intelligence and unit economics." },
  { id: "SECURITY_OPERATIONS", parent: "QA", mission: "Security monitoring, threat detection and incident response." },
  { id: "AUTOMATION_QA", parent: "QA", mission: "Automated tests, regression checks and release validation." }
]);

export const EXTRA_DEPARTMENTS = Object.freeze([
  { id: "CEO_CALL_AGENT", parent: "CEO ADVISOR", mission: "CEO-approved call handling and business call triage on the configured business line.", requiresHumanApproval: true, phoneEnv: "CEO_CALL_NUMBER" },
  { id: "CREATIVE_STUDIO", parent: "GROWTH", mission: "Create advertising concepts, scripts, songs, voiceovers, storyboards and video production plans.", mediaCapabilities: ["songs", "ads", "videos"] },
  { id: "VOICE_RECEPTION", parent: "CORE", mission: "Front-desk voice intake, caller identification by consent, routing and message capture.", requiresHumanApproval: true, phoneEnv: "CEO_CALL_NUMBER" },
  { id: "CONTENT_FACTORY", parent: "MARKETING", mission: "High-volume campaign content: social posts, short-form video scripts, ad variants and publishing packs.", mediaCapabilities: ["ads", "videos"] },
  { id: "INNOVATION_LAB", parent: "CEO ADVISOR", mission: "Prototype difficult workflows, evaluate new tools and solve cross-department bottlenecks." }
]);

export const ALL_SPECIALIST_DEPARTMENTS = Object.freeze([...SPECIALIST_DEPARTMENTS, ...EXTRA_DEPARTMENTS]);
export const ALL_AI_DEPARTMENTS = Object.freeze([
  "CORE", "BABEL", "ARCHITECT", "PIPELINE", "GROWTH", "DESIGNER", "LEGAL", "FINANCE", "QA", "CEO ADVISOR",
  ...ALL_SPECIALIST_DEPARTMENTS.map(d => d.id)
]);

const KEYWORDS = new Map([
  ["RESEARCH", /research|fact.?check|source|evidence|verify facts/i],
  ["EDUCATION", /student|study|course|exam|lesson|learn|education/i],
  ["KNOWLEDGE", /knowledge|explain|what is|how does|information/i],
  ["LANGUAGE_ENGINE", /translate|translation|locali[sz]e|kiswahili|swahili|sheng|dholuo|kikuyu|luhya|kalenjin|kamba|kisii|somali|maasai/i],
  ["VOICE_LANGUAGE", /voice|speech|pronunciation|speak|audio/i],
  ["SOFTWARE_ENGINEERING", /code|coding|software|function|bug fix|implementation|program/i],
  ["DEVOPS", /railway|deploy|deployment|server|hosting|infrastructure|uptime|logs/i],
  ["DATA_ENGINEERING", /data pipeline|ingest|dataset|database|etl|normalize/i],
  ["GOVERNMENT_INTELLIGENCE", /government|ministry|kra|helb|immigration|passport|policy|official requirement/i],
  ["SALES", /sell|sales|lead|customer offer|quotation|prospect/i],
  ["CUSTOMER_SUCCESS", /customer support|complaint|onboarding|retention|client issue/i],
  ["MARKETING", /marketing|campaign|advertis|promotion|audience|brand campaign/i],
  ["PRODUCT", /product|feature|requirement|roadmap|user flow/i],
  ["BRAND", /brand|logo|identity|positioning|slogan/i],
  ["PRIVACY", /privacy|personal data|consent|data protection/i],
  ["RISK", /risk|threat|incident|safety|compliance risk/i],
  ["ACCOUNTING", /accounting|expense|invoice|bookkeeping|accounts/i],
  ["REVENUE_ANALYTICS", /revenue|profit|unit economics|pricing analysis|financial analysis/i],
  ["SECURITY_OPERATIONS", /security|breach|attack|vulnerability|intrusion|threat/i],
  ["AUTOMATION_QA", /test|testing|regression|quality|qa|audit|release validation/i],
  ["CEO_CALL_AGENT", /call me|answer calls|phone calls|call on my behalf|business calls/i],
  ["CREATIVE_STUDIO", /song|music|jingle|video|advert|commercial|voiceover|creative/i],
  ["VOICE_RECEPTION", /reception|caller|incoming call|take a message|front desk/i],
  ["CONTENT_FACTORY", /social post|caption|short video|ad copy|content batch|content calendar/i],
  ["INNOVATION_LAB", /prototype|new tool|innovation|hard problem|bottleneck|experiment/i]
]);

export function routeToDepartment(message = "") {
  const text = String(message).trim();
  for (const [id, pattern] of KEYWORDS) if (pattern.test(text)) return id;
  return "CORE";
}

export function getDepartment(id) {
  return ALL_SPECIALIST_DEPARTMENTS.find(d => d.id === id) || null;
}

export const DEPARTMENT_COUNTS = Object.freeze({ council: 10, specialists: 20, additional: 5, total: 35 });
