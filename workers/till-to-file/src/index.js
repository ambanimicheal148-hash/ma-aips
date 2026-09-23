/**
 * MA.AI.PS PEOPLE-FIRST V346
 * Till-to-File Worker — external runtime adapter
 *
 * IMPORTANT:
 * - This worker NEVER marks an order PAID from a browser request.
 * - A payment is accepted only after the trusted payment provider callback
 *   is authenticated and normalized.
 * - Provider-specific STK Push code belongs in the provider adapter, not here.
 * - Secrets must be supplied by the host environment; never commit them.
 *
 * Routes:
 *   GET  /health
 *   POST /payment/callback
 *   POST /order
 *
 * Environment:
 *   CALLBACK_SHARED_SECRET
 *   MA_AIPS_FULFILLMENT_URL
 *   MA_AIPS_FULFILLMENT_SECRET
 *   MA_AIPS_TILL=0142735036
 */

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });

async function hmacHex(secret, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function verifyCallback(request, rawBody, env) {
  const supplied = request.headers.get("x-ma-aips-signature") || "";
  if (!env.CALLBACK_SHARED_SECRET || !supplied) return false;
  const expected = await hmacHex(env.CALLBACK_SHARED_SECRET, rawBody);
  return timingSafeEqual(supplied, expected);
}

function normalizePayment(payload, env) {
  // Adapt the upstream provider's verified callback into this stable shape.
  // Never infer success from amount alone.
  const resultCode = String(
    payload?.resultCode ?? payload?.ResultCode ?? payload?.status ?? ""
  ).toUpperCase();

  const status = resultCode === "0" || resultCode === "SUCCESS" || resultCode === "COMPLETED"
    ? "VERIFIED"
    : "FAILED";

  return {
    provider: payload?.provider || "payment-provider",
    status,
    transaction_id: String(
      payload?.transaction_id ??
      payload?.transactionId ??
      payload?.ReceiptNumber ??
      payload?.receipt ??
      ""
    ),
    phone: String(payload?.phone ?? payload?.PhoneNumber ?? ""),
    amount_kes: Number(payload?.amount_kes ?? payload?.amount ?? 0),
    till: String(payload?.till ?? payload?.TillNumber ?? env.MA_AIPS_TILL ?? ""),
    order_id: String(payload?.order_id ?? payload?.AccountReference ?? ""),
    raw_status: resultCode
  };
}

async function fulfill(payment, env) {
  if (!env.MA_AIPS_FULFILLMENT_URL) {
    throw new Error("MA_AIPS_FULFILLMENT_URL is not configured");
  }

  const body = JSON.stringify({
    event: "PAYMENT_VERIFIED",
    payment,
    fulfillment: {
      service: "DAIS_REAL_BUSINESS_KIT",
      delivery: "same_thread_when_whatsapp_adapter_is_connected"
    }
  });

  const signature = env.MA_AIPS_FULFILLMENT_SECRET
    ? await hmacHex(env.MA_AIPS_FULFILLMENT_SECRET, body)
    : "";

  const response = await fetch(env.MA_AIPS_FULFILLMENT_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ma-aips-signature": signature
    },
    body
  });

  if (!response.ok) {
    throw new Error(`Fulfillment returned HTTP ${response.status}`);
  }

  return response.json().catch(() => ({ accepted: true }));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({
        service: "MA.AI.PS Till-to-File Worker",
        status: "ACTIVE",
        till: env.MA_AIPS_TILL || "0142735036",
        payment_state_rule: "verified_callback_only",
        version: "V346"
      });
    }

    if (request.method === "POST" && url.pathname === "/payment/callback") {
      const raw = await request.text();

      if (!(await verifyCallback(request, raw, env))) {
        return json({ status: "REJECTED", reason: "invalid_callback_signature" }, 401);
      }

      let payload;
      try {
        payload = JSON.parse(raw);
      } catch {
        return json({ status: "REJECTED", reason: "invalid_json" }, 400);
      }

      const payment = normalizePayment(payload, env);

      if (payment.status !== "VERIFIED") {
        return json({
          status: "RECEIVED",
          payment_status: payment.status,
          order_id: payment.order_id || null
        });
      }

      if (!payment.transaction_id || !payment.order_id || payment.amount_kes <= 0) {
        return json({
          status: "REJECTED",
          reason: "verified_callback_missing_required_fields"
        }, 422);
      }

      try {
        const fulfillment = await fulfill(payment, env);
        return json({
          status: "VERIFIED",
          payment,
          fulfillment
        });
      } catch (error) {
        return json({
          status: "VERIFIED_PAYMENT_FULFILLMENT_PENDING",
          payment,
          error: String(error?.message || error)
        }, 202);
      }
    }

    if (request.method === "POST" && url.pathname === "/order") {
      // This endpoint creates an intent/order request only.
      // It does NOT mark the customer paid.
      let body;
      try {
        body = await request.json();
      } catch {
        return json({ status: "REJECTED", reason: "invalid_json" }, 400);
      }

      const phone = String(body?.phone || "").trim();
      const service = String(body?.service || "DAIS_REAL_BUSINESS_KIT").trim();
      const amount = Number(body?.amount_kes || 50);

      if (!phone || !/^\+?[0-9]{9,15}$/.test(phone.replace(/\s+/g, ""))) {
        return json({ status: "REJECTED", reason: "valid_phone_required" }, 422);
      }

      return json({
        status: "ORDER_CREATED",
        order_id: `PF-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`,
        phone,
        service,
        amount_kes: amount,
        till: env.MA_AIPS_TILL || "0142735036",
        next_step: "provider_stk_push_adapter",
        payment_state: "PENDING"
      }, 201);
    }

    return json({ status: "NOT_FOUND" }, 404);
  }
};
