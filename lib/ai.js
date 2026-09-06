const SYSTEM_PROMPT = `
You are MA-AIPS, an intelligent student academic assistant.
Help students understand their studies, plan their learning, identify weaknesses, improve performance, and stay motivated.
Give clear, practical, accurate answers.
Never help students cheat or impersonate another.
If you are uncertain, say so clearly.
Current student ID: ${studentId || "unknown"}
`;

function normalizeMessages(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, 2000)
  }));
}

function configuredProviders() {
  const preferred = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  const available = {
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY)
  };
  const order = preferred === "groq" ? ["groq", "openai", "gemini"]
    : preferred === "openai" ? ["openai", "groq", "gemini"]
    : preferred === "gemini" ? ["gemini", "groq", "openai"]
    : ["groq", "openai", "gemini"];
  return order.filter(name => available[name]);
}

async function callGroq(messages, studentId) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.GROQ_MODEL || process.env.OPENAI_MODEL || "llama-3.3-70b-versatile";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\nCurrent student ID: ${studentId || "unknown"}` },
        ...normalizeMessages(messages)
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error(`Groq request failed (${response.status})`);
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("Groq returned an empty response");
  return text;
}

async function callGemini(messages, studentId) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  const contents = normalizeMessages(messages).map(m => ({
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
      systemInstruction: { parts: [{ text: `${SYSTEM_PROMPT}\nCurrent student ID: ${studentId || "unknown"}` }] }
    })
  });
  if (!response.ok) throw new Error(`Gemini request failed (${response.status})`);
  const data = await response.json().catch(() => null);
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join("").trim() || "";
  if (!text) throw new Error("Gemini returned an empty response");
  return text;
}

async function callOpenAI(messages, studentId) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("AI provider is not configured");
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\nCurrent student ID: ${studentId || "unknown"}` },
        ...normalizeMessages(messages)
      ],
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error(`OpenAI request failed (${response.status})`);
  const data = await response.json().catch(() => null);
  const text = data?.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error("OpenAI returned an empty response");
  return text;
}

const CALLERS = { groq: callGroq, openai: callOpenAI, gemini: callGemini };

export async function generateAIReply({ message = "", studentId = "", history = [] } = {}) {
  const cleanMessage = String(message).trim();
  if (!cleanMessage) throw new Error("Message is required.");
  const messages = [...normalizeMessages(history), { role: "user", content: cleanMessage }];
  const providers = configuredProviders();
  if (!providers.length) throw new Error("AI provider is not configured");

  let lastError;
  for (const provider of providers) {
    try {
      const text = await CALLERS[provider](messages, studentId);
      console.log(`K.AI.S provider success: ${provider}`);
      return text;
    } catch (error) {
      lastError = error;
      console.error(`K.AI.S provider failed: ${provider}`, error?.message || "unknown error");
    }
  }

  throw new Error(`All configured AI providers failed: ${lastError?.message || "unknown error"}`);
}
