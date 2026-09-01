import { generateAIReply } from "../lib/ai.js";

export default async function handler(req, res) {
if (req.method !== "POST") {
res.setHeader("Allow", "POST");
return res.status(405).json({
error: "Method not allowed."
});
}

try {
const body =
req.body && typeof req.body === "object"
? req.body
: {};

const message =
  typeof body.message === "string"
    ? body.message.trim()
    : "";

const studentId =
  typeof body.student_id === "string" &&
  body.student_id.trim()
    ? body.student_id.trim().slice(0, 100)
    : "GUEST";

const history =
  Array.isArray(body.history)
    ? body.history.slice(-12)
    : [];

if (!message) {
  return res.status(400).json({
    error: "Please provide a message."
  });
}

if (message.length > 4000) {
  return res.status(400).json({
    error: "Message is too long. Maximum length is 4000 characters."
  });
}

const reply = await generateAIReply({
  message,
  studentId,
  history
});

return res.status(200).json({
  success: true,
  reply
});

} catch (error) {
console.error("MA-AIPS chat error:", error);

return res.status(500).json({
  error:
    error?.message ||
    "The AI service could not process your request."
});

}
}
