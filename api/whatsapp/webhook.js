import { generateAIReply } from "../../lib/ai.js";
import { getCloudStatus, sendCloudMessage, verifyWebhook } from "../../lib/whatsapp-cloud.js";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const challenge = verifyWebhook(req.query?.hub_mode, req.query?.hub_verify_token, req.query?.hub_challenge);
    if (challenge) return res.status(200).send(challenge);
    return res.status(403).json({ error: "Webhook verification failed" });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const body = req.body || {};
  try {
    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        const value = change.value || {};
        for (const message of value.messages || []) {
          const from = message.from;
          const text = message?.text?.body;
          if (!from || !text) continue;
          try {
            const result = await generateAIReply({ message: text.slice(0, 4000), history: [], language: "Auto", studentId: from });
            const reply = result?.text || "No response received.";
            await sendCloudMessage(from, reply);
          } catch (error) {
            console.error("WhatsApp Cloud AI reply error:", error?.message || error);
          }
        }
      }
    }
    return res.status(200).json({ received: true, provider: "meta_cloud_api", configured: getCloudStatus().configured });
  } catch (error) {
    console.error("WhatsApp Cloud webhook error:", error?.message || error);
    return res.status(200).json({ received: true });
  }
}
