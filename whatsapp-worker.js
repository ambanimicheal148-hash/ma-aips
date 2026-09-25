import { startWhatsApp } from "./lib/whatsapp.js";

console.log(`MA-AIPS WhatsApp worker starting region=${process.env.RAILWAY_REPLICA_REGION || "local"} replica=${process.env.RAILWAY_REPLICA_ID || "local"}`);

try {
  await startWhatsApp();
  console.log("MA-AIPS WhatsApp worker connected");
} catch (error) {
  console.error("MA-AIPS WhatsApp worker failed:", error);
  process.exitCode = 1;
}

process.on("SIGTERM", () => {
  console.log("MA-AIPS WhatsApp worker received SIGTERM");
  process.exit(0);
});
