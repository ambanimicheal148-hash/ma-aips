# MA.AI.PS V346 — Till-to-File Worker

External-runtime adapter for the People-First pipeline.

## Pipeline

Customer voice → service selection → order → payment request → **trusted provider callback** → VERIFIED → DAIS fulfillment → real files → delivery/evidence.

## Security rule

A browser, phone number, or client-side "success" flag can create an order, but cannot mark it PAID.

Only an authenticated payment-provider callback may move:

`PENDING → VERIFIED`

The worker also requires an order ID, transaction ID and positive amount before requesting fulfillment.

## Required environment

- `MA_AIPS_TILL=0142735036`
- `CALLBACK_SHARED_SECRET=<secret>`
- `MA_AIPS_FULFILLMENT_URL=<private fulfillment endpoint>`
- `MA_AIPS_FULFILLMENT_SECRET=<secret>`

## Provider adapter

The provider-specific STK Push request is deliberately isolated from this worker. Connect it to the authorized payment provider using its current official API documentation and credentials.

Do not hard-code consumer keys, secrets, passkeys or callback credentials into Git.

## Routes

- `GET /health`
- `POST /order`
- `POST /payment/callback`

## Verification before production

1. Provider callback signature verification.
2. Duplicate callback/idempotency test.
3. Failed-payment test.
4. Wrong-amount test.
5. Wrong-till test.
6. Missing-order test.
7. Fulfillment timeout/retry test.
8. Receipt/evidence creation.
9. Real-file nonzero-byte verification.
10. Same-thread WhatsApp delivery verification.

No production claim is made by this source file alone.
