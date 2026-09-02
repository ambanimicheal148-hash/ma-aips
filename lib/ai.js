const SYSTEM_PROMPT = `
You are MA-AIPS, an intelligent student academic support assistant.

Help students understand their studies, plan their learning,
identify weaknesses, improve performance, and stay motivated.

Give clear, practical, accurate answers.
Never help students cheat or impersonate another person.
If you are uncertain, say so clearly.
`;

function getProvider() {
  const provider = String(process.env.AI_PROVIDER || "gemini")
    .trim()
    .toLowerCase();

  if (provider === "openai" && process.env.OPENAI_API_KEY) {
    return "openai";
  }

  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  if (process.env.GEMINI_API_KEY) {
    return "gemini";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return null;
}

function normalizeMessages(messages) {
  if (!Array.isArray(messages)) {
    return [];
  }

  return messages
    .filter(
      (message) =>
        message &&
        typeof message === "object" &&
        typeof message.content === "string" &&
        message.content.trim()
    )
    .slice(-12)
    .map((message) => ({
      role:
        message.role === "assistant" || message.role === "model"
          ? "assistant"
          : "user",
      content: message.content.trim().slice(0, 8000)
    }));
}

async function callGemini(messages, studentId) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("AI provider is not configured.");
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

  const contents = normalizeMessages(messages).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [
      {
        text: message.content
      }
    ]
  }));

  contents.unshift({
    role: "user",
    parts: [
      {
        text: `${SYSTEM_PROMPT}

Current student ID: ${studentId || "unknown"}`
      }
    ]
  });

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1000
      }
    })
  });

  if (!response.ok) {
    throw new Error("AI provider request failed.");
  }

  const data = await response.json().catch(() => ({}));

  const text =
    data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text || "")
      .join("")
      .trim() || "";

  if (!text) {
    throw new Error("AI provider returned an empty response.");
  }

  return text;
}

async function callOpenAI(messages, studentId) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("AI provider is not configured.");
  }

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const normalizedMessages = normalizeMessages(messages);

  const response = await fetch(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `${SYSTEM_PROMPT}

Current student ID: ${studentId || "unknown"}`
          },
          ...normalizedMessages
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    }
  );

  if (!response.ok) {
    throw new Error("AI provider request failed.");
  }

  const data = await response.json().catch(() => ({}));

  const text =
    data?.choices?.[0]?.message?.content?.trim() || "";

  if (!text) {
    throw new Error("AI provider returned an empty response.");
  }

  return text;
}

export async function generateAIReply({
  message = "",
  studentId = "",
  history = []
} = {}) {
  const cleanMessage = String(message).trim();

  if (!cleanMessage) {
    throw new Error("Message is required.");
  }

  const messages = [
    ...normalizeMessages(history),
    {
      role: "user",
      content: cleanMessage
    }
  ];

  const provider = getProvider();

  if (!provider) {
    throw new Error("AI provider is not configured.");
  }

  if (provider === "openai") {
    return callOpenAI(messages, studentId);
  }

  return callGemini(messages, studentId);
      }
