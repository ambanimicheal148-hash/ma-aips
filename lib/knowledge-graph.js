import crypto from "node:crypto";

export const GRAPH_TYPES = Object.freeze([
  "USER","LANGUAGE","INTENT","TASK","FILE","SOURCE","PAYMENT","SERVICE","DELIVERY","AUDIT"
]);

export function graphNode(type, id, attributes = {}) {
  if (!GRAPH_TYPES.includes(type)) throw new Error("Unknown graph node type");
  return { id:String(id), type, attributes, createdAt:new Date().toISOString() };
}

export function graphEdge(from, relation, to, evidence = {}) {
  return { id:crypto.randomUUID(), from:String(from), relation:String(relation), to:String(to), evidence, createdAt:new Date().toISOString() };
}

export function buildJobGraph(job = {}) {
  const nodes = [];
  const edges = [];
  const add=(type,id,attributes)=>nodes.push(graphNode(type,id,attributes));
  if(job.userId) add("USER",job.userId);
  if(job.language) { add("LANGUAGE",job.language); if(job.userId) edges.push(graphEdge(job.userId,"USES_LANGUAGE",job.language)); }
  if(job.intent) { add("INTENT",job.intent); if(job.userId) edges.push(graphEdge(job.userId,"REQUESTED_INTENT",job.intent)); }
  if(job.taskId) { add("TASK",job.taskId); if(job.userId) edges.push(graphEdge(job.userId,"OWNS_TASK",job.taskId)); }
  if(job.fileId) { add("FILE",job.fileId); if(job.taskId) edges.push(graphEdge(job.taskId,"PRODUCED",job.fileId)); }
  if(job.sourceId) { add("SOURCE",job.sourceId); if(job.taskId) edges.push(graphEdge(job.taskId,"VERIFIED_BY",job.sourceId)); }
  if(job.paymentId) { add("PAYMENT",job.paymentId); if(job.taskId) edges.push(graphEdge(job.taskId,"PAID_BY",job.paymentId)); }
  if(job.serviceId) { add("SERVICE",job.serviceId); if(job.taskId) edges.push(graphEdge(job.taskId,"EXECUTED_SERVICE",job.serviceId)); }
  if(job.deliveryId) { add("DELIVERY",job.deliveryId); if(job.fileId) edges.push(graphEdge(job.fileId,"DELIVERED_AS",job.deliveryId)); }
  if(job.auditId) { add("AUDIT",job.auditId); if(job.taskId) edges.push(graphEdge(job.taskId,"AUDITED_AS",job.auditId)); }
  return { nodes, edges };
}
