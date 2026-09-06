const BASE_SYSTEM_PROMPT = `
You are MA-AIPS, an intelligent student academic assistant.
Help students understand their studies, plan their learning, identify weaknesses, improve performance, and stay motivated.
Give clear, practical, accurate answers.
Never help students cheat or impersonate another.
If you are uncertain, say so clearly.
`;

function normalizeMessages(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 2000)
  }));
}

function getProvider() {
  const provider = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  if (provider === "groq" && process.env.GROQ_API_KEY) return "groq";
  if (provider === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (provider === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.GROQ_API_KEY) return "groq";
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  return "";
}

function buildSystemPrompt({ studentId = "", language = "", councilRole = "" } = {}) {
  const roleLine = councilRole
    ? `K.AI.S Council employee handling this request: ${councilRole}. Stay within that role and do not claim human approval.`
    : "";
  const languageLine = language && language !== "Auto"
    ? `Respond in ${language} unless the user clearly requests another language.`
    : "";
  const studentLine = studentId
    ? `Student context identifier: ${studentId}. Do not store, expose, or infer additional personal data from it.`
    : "";
  return [BASE_SYSTEM_PROMPT.trim(), roleLine, languageLine, studentLine].filter(Boolean).join("\n");
}

async function callGroq(messages, options) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "llama-3.3-70b-versatile";
  const normalizedMessages = normalizeMessages(messages);
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: buildSystemPrompt(options) }, ...normalizedMessages],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    console.error("GROQ ERROR:", response.status, errText);
    throw new Error("AI provider request failed");
  }
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
}

async function callGemini(messages, options) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const normalizedMessages = normalizeMessages(messages);
  const contents = normalizedMessages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }]
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      systemInstruction: { parts: [{ text: buildSystemPrompt(options) }] }
    })
  });
  if (!response.ok) throw new Error("AI provider request failed");
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim() || "";
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
}

async function callOpenAI(messages, options) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const normalizedMessages = normalizeMessages(messages);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: buildSystemPrompt(options) }, ...normalizedMessages],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error("AI provider request failed");
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("AI provider returned an empty response");
  return text;
}

export async function generateAIReply({
  message = "",
  studentId = "",
  history = [],
  language = "",
  councilRole = ""
} = {}) {
  const cleanMessage = String(message).trim();
  if (!cleanMessage) throw new Error("Message is required.");
  const messages = [...normalizeMessages(history), { role: "user", content: cleanMessage }];
  const provider = getProvider();
  if (!provider) throw new Error("AI provider is not configured");
  const options = { studentId, language, councilRole };
  if (provider === "groq") return callGroq(messages, options);
  if (provider === "openai") return callOpenAI(messages, options);
  return callGemini(messages, options);
}
