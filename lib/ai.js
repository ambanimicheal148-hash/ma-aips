const SYSTEM_PROMPT = `
You are MA-AIPS, an intelligent academic and personal AI coach.

Your responsibilities:

- Help students understand academic concepts.
- Explain difficult topics clearly and accurately.
- Help students plan and organize their studies.
- Encourage disciplined, independent learning.
- Help with assignments without facilitating cheating.
- Be respectful, patient, practical, and encouraging.
- If information is uncertain, say so rather than inventing facts.
- Keep responses useful and reasonably concise.

You are an AI coach and do not replace qualified teachers, administrators,
doctors, lawyers, or other professionals.
`;

function getProvider() {
const configured = String(
process.env.AI_PROVIDER || ""
).trim().toLowerCase();

if (
configured === "gemini" &&
process.env.GEMINI_API_KEY
) {
return "gemini";
}

if (
configured === "openai" &&
process.env.OPENAI_API_KEY
) {
return "openai";
}

if (process.env.GEMINI_API_KEY) {
return "gemini";
}

if (process.env.OPENAI_API_KEY) {
return "openai";
}

return null;
}

function normalizeHistory(history) {
if (!Array.isArray(history)) {
return [];
}

return history
.filter(
item =>
item &&
typeof item === "object"
)
.filter(
item =>
typeof item.content === "string" &&
item.content.trim()
)
.slice(-12)
.map(item => ({
role:
item.role === "assistant" ||
item.role === "model"
? "assistant"
: "user",

  content:
    item.content
      .trim()
      .slice(0, 8000)
}));

}

async function callGemini({
message,
studentId,
history
}) {
const apiKey =
process.env.GEMINI_API_KEY;

const model =
process.env.GEMINI_MODEL ||
"gemini-2.5-flash";

const contents =
normalizeHistory(history).map(item => ({
role:
item.role === "assistant"
? "model"
: "user",

  parts: [
    {
      text: item.content
    }
  ]
}));

contents.push({
role: "user",
parts: [
{
text: message
}
]
});

const url =
"https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent";

const response =
await fetch(url, {
method: "POST",

  headers: {
    "Content-Type": "application/json",
    "x-goog-api-key": apiKey
  },

  body: JSON.stringify({
    systemInstruction: {
      parts: [
        {
          text:
            `${SYSTEM_PROMPT}\n\nCurrent student ID: ${studentId}`
        }
      ]
    },

    contents,

    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1000
    }
  })
});

const data =
await response
.json()
.catch(() => ({}));

if (!response.ok) {
throw new Error(
data?.error?.message ||
"Gemini request failed with HTTP ${response.status}."
);
}

const reply =
data?.candidates?.[0]?.content?.parts
?.map(part => part?.text || "")
.join("")
.trim();

if (!reply) {
throw new Error(
"Gemini returned an empty response."
);
}

return reply;
}

async function callOpenAI({
message,
studentId,
history
}) {
const apiKey =
process.env.OPENAI_API_KEY;

const model =
process.env.OPENAI_MODEL ||
"gpt-4o-mini";

const messages = [
{
role: "system",
content:
"${SYSTEM_PROMPT}\n\nCurrent student ID: ${studentId}"
},

...normalizeHistory(history),

{
  role: "user",
  content: message
}

];

const response =
await fetch(
"https://api.openai.com/v1/chat/completions",
{
method: "POST",

    headers: {
      "Content-Type": "application/json",
      "Authorization":
        `Bearer ${apiKey}`
    },

    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
      max_tokens: 1000
    })
  }
);

const data =
await response
.json()
.catch(() => ({}));

if (!response.ok) {
throw new Error(
data?.error?.message ||
"OpenAI request failed with HTTP ${response.status}."
);
}

const reply =
data?.choices?.[0]?.message?.content
?.trim();

if (!reply) {
throw new Error(
"OpenAI returned an empty response."
);
}

return reply;
}

export async function generateAIReply({
message,
studentId,
history
}) {
const provider =
getProvider();

if (!provider) {
throw new Error(
"No AI provider is configured. Add GEMINI_API_KEY or OPENAI_API_KEY in Vercel Environment Variables."
);
}

if (provider === "gemini") {
return callGemini({
message,
studentId,
history
});
}

return callOpenAI({
message,
studentId,
history
});
}
