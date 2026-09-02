export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed."
    });
  }

  const hasGeminiKey = Boolean(
    process.env.GEMINI_API_KEY
  );

  const model =
    process.env.GEMINI_MODEL ||
    "gemini-2.5-flash";

  if (!hasGeminiKey) {
    return res.status(500).json({
      success: false,
      provider: "gemini",
      error: "GEMINI_API_KEY is missing."
    });
  }

  try {
    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Reply with exactly: MA-AIPS AI TEST OK"
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 50
        }
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        provider: "gemini",
        model,
        http_status: response.status,
        error:
          data?.error?.message ||
          "Gemini request failed."
      });
    }

    const reply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text || "")
        .join("")
        .trim() || "";

    return res.status(200).json({
      success: true,
      provider: "gemini",
      model,
      reply
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      provider: "gemini",
      model,
      error:
        error?.message ||
        "Unexpected Gemini connection error."
    });
  }
}
