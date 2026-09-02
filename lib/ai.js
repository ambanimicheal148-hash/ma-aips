==============================
FILE 1: lib/ai.js
==============================

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
    parts: [{ text: message.content }]
  }));

  contents.push({
    role: "user",
    parts: [
      {
        text:
          `${SYSTEM_PROMPT}\n\nCurrent student ID: ${
            studentId || "unknown"
          }`
      }
    ]
  });

  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent`;

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
            content:
              `${SYSTEM_PROMPT}\n\nCurrent student ID: ${
                studentId || "unknown"
              }`
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

export async function generateAIResponse(
  messages = [],
  studentId = ""
) {
  const provider = getProvider();

  if (!provider) {
    throw new Error("AI provider is not configured.");
  }

  if (provider === "openai") {
    return callOpenAI(messages, studentId);
  }

  return callGemini(messages, studentId);
}


==============================
FILE 2: api/student.js
==============================

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");

    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const studentId = String(
    req.query?.student_id ||
      req.query?.id ||
      ""
  )
    .trim()
    .slice(0, 100);

  if (!studentId) {
    return res.status(400).json({
      error: "student_id is required."
    });
  }

  const student = {
    student_id: studentId,
    name:
      studentId.toUpperCase() === "TEST123"
        ? "Test Student"
        : "Student",
    course: "General Studies",
    status: "active"
  };

  return res.status(200).json({
    success: true,
    student
  });
}


==============================
FILE 3: dashboard.html
==============================

<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  >

  <title>MA-AIPS Dashboard</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      min-height: 100vh;
      background: #020617;
      color: #f8fafc;
      font-family:
        Arial,
        Helvetica,
        sans-serif;

      display: flex;
      align-items: center;
      justify-content: center;
    }

    main {
      width: min(700px, 92%);
      padding: 32px 20px;
      text-align: center;
    }

    h1 {
      margin: 0 0 10px;
      font-size: 32px;
    }

    p {
      color: #cbd5e1;
      line-height: 1.6;
    }

    .actions {
      margin-top: 28px;
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      justify-content: center;
    }

    a {
      display: inline-block;
      padding: 14px 20px;
      border-radius: 10px;
      background: #6366f1;
      color: white;
      text-decoration: none;
      font-weight: bold;
    }

    a:hover {
      opacity: 0.9;
    }

    .status {
      margin-top: 28px;
      padding: 16px;
      border: 1px solid #334155;
      border-radius: 12px;
      background: #0f172a;
    }

    #apiStatus {
      font-weight: bold;
    }
  </style>
</head>

<body>

  <main>

    <h1>MA-AIPS Dashboard</h1>

    <p>
      Autonomous Intelligence Platform
    </p>

    <div class="actions">

      <a href="/student.html?student_id=TEST123">
        Open AI Coach
      </a>

      <a href="/api/health">
        Check API
      </a>

    </div>

    <div class="status">

      <p>
        Platform status:
        <span id="apiStatus">
          Checking...
        </span>
      </p>

    </div>

  </main>

  <script>
    async function checkAPI() {
      const status = document.getElementById("apiStatus");

      try {
        const response = await fetch("/api/health");

        if (!response.ok) {
          throw new Error("API unavailable");
        }

        const data = await response.json();

        if (data?.status === "ok") {
          status.textContent = "Online";
        } else {
          status.textContent = "Available";
        }
      } catch (error) {
        status.textContent = "Unavailable";
      }
    }

    checkAPI();
  </script>

</body>
</html>


==============================
FILE 4: vercel.json
==============================

{
  "version": 2,
  "cleanUrls": true
  }
