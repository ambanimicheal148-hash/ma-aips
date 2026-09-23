import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outputRoot = path.join(root, "public", "outputs");

export const REQUIRED_DELIVERABLES = Object.freeze([
  "PNG", "PRINT_PDF", "SOCIAL_STORY", "CAPTION", "SOURCE_BAR"
]);

export async function prepareOrderOutput(orderId) {
  const safe = String(orderId || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0,100);
  if (!safe) throw new Error("orderId is required");
  const dir = path.join(outputRoot, safe);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function registerOutput({ orderId, filePath, mime, required = false } = {}) {
  const dir = await prepareOrderOutput(orderId);
  const absolute = path.resolve(String(filePath || ""));
  if (!absolute.startsWith(path.resolve(dir) + path.sep)) {
    throw new Error("Output file must be inside /public/outputs/{order_id}/");
  }
  let stat;
  try { stat = await fs.stat(absolute); } catch { throw new Error("OUTPUT_FILE_MISSING"); }
  if (!stat.isFile() || stat.size <= 0) throw new Error("OUTPUT_FILE_INVALID");
  const bytes = await fs.readFile(absolute);
  const checksum = crypto.createHash("sha256").update(bytes).digest("hex");
  return {
    orderId: String(orderId),
    path: absolute,
    publicPath: "/" + path.relative(path.join(root, "public"), absolute).replaceAll(path.sep, "/"),
    mime: String(mime || "application/octet-stream"),
    bytes: stat.size,
    sha256: checksum,
    required: Boolean(required),
    verifiedAt: new Date().toISOString(),
    status: "VERIFIED"
  };
}

export function deliveryStatus(outputs = [], requiredTypes = REQUIRED_DELIVERABLES) {
  const verified = new Set(outputs.filter(x => x && x.status === "VERIFIED").map(x => String(x.type || "").toUpperCase()));
  const missing = requiredTypes.filter(x => !verified.has(x));
  return { status: missing.length ? "PARTIALLY COMPLETED" : "VERIFIED", missing };
}
