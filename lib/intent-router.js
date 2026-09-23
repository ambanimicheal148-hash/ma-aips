// MA.AI.PS V343 — deterministic intent classification layer.
// This is a routing aid, not an LLM benchmark. Scores are evidence for routing only.

const INTENTS = Object.freeze([
  ["GOVERNMENT_RESEARCH", /\b(government|ministry|kra|helb|immigration|passport|e[- ]?citizen|official requirement|policy|regulation)\b/i],
  ["SOURCE_VERIFICATION", /\b(source|sources|verify|verified|fact.?check|evidence|official|is this true)\b/i],
  ["PAYMENT", /\b(m-?pesa|mpesa|payment|pay|paid|transaction|receipt|refund|stk)\b/i],
  ["DOCUMENT_GENERATION", /\b(cv|resume|cover letter|motivation letter|pdf|document|application|letter)\b/i],
  ["MEDIA_CREATION", /\b(poster|flyer|song|music|jingle|advert|video|voiceover|image|design|reel)\b/i],
  ["LANGUAGE", /\b(translate|translation|kiswahili|swahili|sheng|dholuo|luo|kikuyu|luhya|kalenjin|kamba|kisii|somali|maasai|german|french|amharic|lingala|kinyarwanda)\b/i],
  ["VOICE", /\b(voice|audio|voice note|speech|speak|pronunciation|call|caller|phone)\b/i],
  ["WHATSAPP", /\b(whatsapp|wa message|send it to whatsapp|same thread)\b/i],
  ["SECURITY", /\b(security|attack|hack|injection|jailbreak|malware|fraud|abuse|vulnerability|breach|red team|zero trust)\b/i],
  ["SOFTWARE", /\b(code|coding|software|api|function|bug|debug|implementation|program|database|deploy|railway|server)\b/i],
  ["EDUCATION", /\b(student|study|course|exam|lesson|learn|school|university|scholarship)\b/i],
  ["BUSINESS", /\b(business|customer|sales|marketing|pricing|revenue|profit|campaign|brand|service)\b/i],
  ["KNOWLEDGE", /\b(what is|how does|explain|information|knowledge|meaning|why)\b/i]
]);

export function classifyIntent(message = "") {
  const text = String(message).trim();
  const matches = [];
  for (const [intent, pattern] of INTENTS) {
    const found = text.match(pattern);
    if (found) matches.push({ intent, evidence: found[0] });
  }
  if (!matches.length) return { intent: "GENERAL", confidence: 0.25, matches: [] };
  const unique = [...new Set(matches.map(m => m.intent))];
  const confidence = Math.min(0.98, 0.55 + (unique.length - 1) * 0.10);
  return { intent: unique[0], confidence, matches };
}

export function routePlan(message = "") {
  const c = classifyIntent(message);
  const chain = [];
  if (["GOVERNMENT_RESEARCH", "SOURCE_VERIFICATION"].includes(c.intent)) chain.push("RESEARCH", "GOVERNMENT_INTELLIGENCE", "QA");
  else if (c.intent === "PAYMENT") chain.push("FINANCE", "SECURITY_OPERATIONS", "QA");
  else if (c.intent === "DOCUMENT_GENERATION") chain.push("KNOWLEDGE", "PRODUCT", "QA");
  else if (c.intent === "MEDIA_CREATION") chain.push("CREATIVE_STUDIO", "QA");
  else if (c.intent === "LANGUAGE") chain.push("LANGUAGE_ENGINE", "VOICE_LANGUAGE", "QA");
  else if (c.intent === "VOICE") chain.push("VOICE_LANGUAGE", "VOICE_RECEPTION", "QA");
  else if (c.intent === "WHATSAPP") chain.push("CUSTOMER_SUCCESS", "QA");
  else if (c.intent === "SECURITY") chain.push("SECURITY_OPERATIONS", "REDTEAM_GUARDIAN", "QA");
  else if (c.intent === "SOFTWARE") chain.push("SOFTWARE_ENGINEERING", "DEVOPS", "QA");
  else if (c.intent === "EDUCATION") chain.push("EDUCATION", "KNOWLEDGE", "QA");
  else if (c.intent === "BUSINESS") chain.push("PRODUCT", "GROWTH", "QA");
  else chain.push("CORE", "QA");
  return { ...c, chain };
}
