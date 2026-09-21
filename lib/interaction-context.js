const ORDER_PATTERNS = [
  /^(please\s+)?(do|make|build|create|fix|add|remove|update|deploy|check|inspect|run|proceed|enable|disable|connect|send|generate|implement|change|restore|upgrade|start|stop|finish|complete)\b/i,
  /\b(proceed|do it|go ahead|make it happen|implement this|fix this now|deploy now|run it now)\b/i
];

const CHAT_PATTERNS = [
  /^(hi|hello|hey|good morning|good afternoon|good evening|how are you|what's up|talk to me|let's chat|just chatting)\b/i,
  /\?\s*$/
];

const MOOD_SIGNALS = {
  frustrated: /\b(still|again|mess|messing|broken|frustrat|annoy|tired|waste|waiting|fed up|disappoint|stop asking|enough)\b/i,
  urgent: /\b(now|immediately|asap|urgent|quickly|today|right away)\b/i,
  positive: /\b(good|great|nice|excellent|perfect|love|happy|proceed)\b/i,
  calm: /\b(okay|fine|alright|understood|thanks|thank you)\b/i
};

export function classifyInteraction(message = "") {
  const text = String(message).trim();
  if (!text) return { mode: "CHAT", confidence: 1, mood: "neutral", signals: [] };

  const isOrder = ORDER_PATTERNS.some(p => p.test(text));
  const isChat = CHAT_PATTERNS.some(p => p.test(text));
  const signals = Object.entries(MOOD_SIGNALS).filter(([, p]) => p.test(text)).map(([name]) => name);

  let mood = "neutral";
  if (signals.includes("frustrated")) mood = "frustrated";
  else if (signals.includes("urgent")) mood = "urgent";
  else if (signals.includes("positive")) mood = "positive";
  else if (signals.includes("calm")) mood = "calm";

  return {
    mode: isOrder && !isChat ? "ORDER" : "CHAT",
    confidence: isOrder && !isChat ? 0.9 : isChat ? 0.85 : 0.6,
    mood,
    signals
  };
}

export function timeContext(now = new Date()) {
  const d = now instanceof Date ? now : new Date(now);
  const parts = new Intl.DateTimeFormat("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false
  }).formatToParts(d);
  const get = name => (parts.find(p => p.type === name) || {}).value || "";
  const hour = Number(get("hour"));
  const period = hour < 5 ? "night" : hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 21 ? "evening" : "night";
  return {
    timezone: "Africa/Nairobi",
    localDate: get("year") + "-" + get("month") + "-" + get("day"),
    localTime: get("hour") + ":" + get("minute") + ":" + get("second"),
    weekday: get("weekday"),
    period
  };
}

export function interactionPrompt(message = "") {
  const interaction = classifyInteraction(message);
  const time = timeContext();
  return [
    "\nREAL-TIME AWARENESS:",
    "Current Kenya time: " + time.weekday + ", " + time.localDate + " " + time.localTime + " (" + time.timezone + ").",
    "Time period: " + time.period + ".",
    "Interaction mode: " + interaction.mode + ".",
    "Mood signal: " + interaction.mood + ".",
    "Mood sensitivity: infer only from the user's current wording/context; never claim certainty about their internal mental state.",
    interaction.mode === "ORDER"
      ? "ORDER RULE: Treat the user's clear operational instruction as an order. Execute/route it according to authority, safety, and verification rules; do not turn it into casual conversation."
      : "CHAT RULE: Treat this as conversation unless the user clearly changes into an operational instruction.",
    interaction.mood === "frustrated"
      ? "TONE RULE: The user appears frustrated from wording. Be calm, direct, efficient, acknowledge the task through action, and avoid unnecessary questions."
      : "TONE RULE: Match the user's conversational tone naturally without over-interpreting emotion."
  ].join("\n");
}
