export const MPESA_STATES = Object.freeze([
  "ORDER_CREATED","STK_INITIATED","PENDING","CALLBACK_RECEIVED",
  "AUTHENTICATED","AMOUNT_VERIFIED","ORDER_MATCHED","PAID",
  "SERVICE_ACTIVATED","DELIVERED","RECEIPTED","REFUND_PENDING","REFUNDED",
  "FAILED","REJECTED"
]);

export function transitionPayment(payment, next, evidence = {}) {
  const current = String(payment?.state || "ORDER_CREATED");
  const allowed = {
    ORDER_CREATED:["STK_INITIATED","FAILED"],
    STK_INITIATED:["PENDING","FAILED"],
    PENDING:["CALLBACK_RECEIVED","FAILED"],
    CALLBACK_RECEIVED:["AUTHENTICATED","REJECTED"],
    AUTHENTICATED:["AMOUNT_VERIFIED","REJECTED"],
    AMOUNT_VERIFIED:["ORDER_MATCHED","REJECTED"],
    ORDER_MATCHED:["PAID","REJECTED"],
    PAID:["SERVICE_ACTIVATED","REFUND_PENDING"],
    SERVICE_ACTIVATED:["DELIVERED","FAILED"],
    DELIVERED:["RECEIPTED","REFUND_PENDING"],
    RECEIPTED:[],
    REFUND_PENDING:["REFUNDED","FAILED"],
    REFUNDED:[],
    FAILED:[],
    REJECTED:[],
  };
  if (!MPESA_STATES.includes(next) || !allowed[current]?.includes(next)) {
    throw new Error("INVALID_MPESA_TRANSITION:" + current + "->" + next);
  }
  return Object.freeze({
    ...payment,
    state: next,
    updatedAt: new Date().toISOString(),
    evidence: { ...(payment?.evidence || {}), [next]: evidence }
  });
}

export function verifyCallbackEvidence({ callback, expectedAmount, expectedOrderId } = {}) {
  if (!callback || !callback.transactionId) return { ok:false, reason:"missing_transaction_id" };
  if (String(callback.orderId) !== String(expectedOrderId)) return { ok:false, reason:"order_mismatch" };
  if (Number(callback.amount) !== Number(expectedAmount)) return { ok:false, reason:"amount_mismatch" };
  if (!callback.authenticated) return { ok:false, reason:"callback_not_authenticated" };
  return { ok:true, transactionId:String(callback.transactionId) };
}
