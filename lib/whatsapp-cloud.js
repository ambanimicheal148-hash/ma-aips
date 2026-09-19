const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_VERSION || "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

function config() {
  return {
    token: String(process.env.WHATSAPP_CLOUD_ACCESS_TOKEN || "").trim(),
    phoneNumberId: String(process.env.WHATSAPP_PHONE_NUMBER_ID || "").trim(),
    verifyToken: String(process.env.WHATSAPP_VERIFY_TOKEN || "").trim()
  };
}

export function getCloudStatus() {
  const c = config();
  return {
    provider: "meta_cloud_api",
    configured: Boolean(c.token && c.phoneNumberId),
    webhookConfigured: Boolean(c.verifyToken),
    phoneNumberIdConfigured: Boolean(c.phoneNumberId),
    accessTokenConfigured: Boolean(c.token),
    graphVersion: GRAPH_VERSION
  };
}

export function verifyWebhook(mode, token, challenge) {
  const c = config();
  if (mode === "subscribe" && token && token === c.verifyToken && challenge) return String(challenge);
  return null;
}

export async function sendCloudMessage(to, text) {
  const c = config();
  if (!c.token || !c.phoneNumberId) throw new Error("WhatsApp Cloud API credentials are not configured");
  const response = await fetch(`${GRAPH_BASE}/${encodeURIComponent(c.phoneNumberId)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${c.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: String(text).slice(0, 4096) } })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `WhatsApp Cloud API failed (${response.status})`);
  return data;
}
