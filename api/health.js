export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const aiProviderConfigured = Boolean(
    process.env.GROQ_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY
  );

  const whatsappBridgeConfigured =
    String(process.env.WHATSAPP_BRIDGE_PRIMARY || "false").trim().toLowerCase() === "true" &&
    Boolean(String(process.env.WHATSAPP_AUTH_DIR || "").trim());

  const checks = {
    api: "running",
    aiProvider: aiProviderConfigured ? "configured" : "not_configured",
    whatsappBridge: whatsappBridgeConfigured ? "configured" : "not_configured"
  };

  return res.status(200).json({
    status: aiProviderConfigured ? "ok" : "degraded",
    service: "MA-AIPS",
    message: aiProviderConfigured
      ? "API is running; an AI provider is configured. Provider response still requires a functional test."
      : "API is running, but no AI provider credentials are configured. AI chat is not ready.",
    checks,
    productionReady: false,
    note: "This endpoint reports configuration signals only; it does not claim end-to-end AI, WhatsApp, payment, or federation verification.",
    timestamp: new Date().toISOString()
  });
}
