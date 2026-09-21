import { recallMemories, saveMemory, formatMemories, memoryEnabled } from "./memory.js";
import { councilRoute } from "./council.js";
import { runControlledTask } from "./master-control.js";
import { commanderSnapshot } from "./commander.js";

const DEFAULT_TIMEOUT_MS = Number(process.env.MASTER_AI_TASK_TIMEOUT_MS || 30000);
const BASE_PROMPT = "You are Supreme AI Commander of MA-AI.PS. Give accurate, practical assistance. Never invent facts. Preserve relevant long-term memory.";

function messagesOf(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-10).map(function (m) {
    return { role: m && m.role === "assistant" ? "assistant" : "user", content: String(m && m.content || "").slice(0, 2000) };
  });
}

function providers() {
  var preferred = String(process.env.AI_PROVIDER || "").trim().toLowerCase();
  var available = {
    groq: Boolean(process.env.GROQ_API_KEY),
    openai: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY)
  };
  var order;
  if (preferred === "groq") order = ["groq", "openai", "gemini"];
  else if (preferred === "openai") order = ["openai", "groq", "gemini"];
  else if (preferred === "gemini") order = ["gemini", "groq", "openai"];
  else order = ["groq", "openai", "gemini"];
  return order.filter(function (name) { return available[name]; });
}

function languageName(value) {
  var raw = String(value || "").trim();
  if (!raw) return "English";
  var key = raw.toLowerCase();
  var map = {
    en: "English", english: "English",
    sw: "Kiswahili", swahili: "Kiswahili", kiswahili: "Kiswahili",
    sheng: "Sheng", dholuo: "Dholuo", luo: "Dholuo",
    kikuyu: "Kikuyu", gikuyu: "Kikuyu", luhya: "Luhya", bukusu: "Bukusu",
    kalenjin: "Kalenjin", kamba: "Kamba", kikamba: "Kamba",
    kisii: "Kisii", ekegusii: "Kisii", somali: "Somali",
    maasai: "Maasai", maa: "Maasai", ksl: "Kenyan Sign Language"
  };
  return map[key] || raw;
}

function promptFor(studentId, language, role, memories) {
  var lang = languageName(language);
  var memory = memories && memories.length ? "\n\nMEMORY:\n" + formatMemories(memories) : "\n\nMEMORY: none";
  var langRule = lang === "English"
    ? "\nAnswer in English unless the user requests another language."
    : "\nLANGUAGE ENGINE: Answer entirely in " + lang + ". Do not invent translations. Preserve names, numbers and official terms.";
  var roleRule = role ? "\nDepartment: " + role + "." : "";
  return BASE_PROMPT + langRule + roleRule + "\nSession: " + (studentId || "unknown") + memory;
}

async function request(url, options) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, Math.max(1000, DEFAULT_TIMEOUT_MS));
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function groq(msgs, id, lang, role, mem) {
  var key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("Groq is not configured");
  var response = await request("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: promptFor(id, lang, role, mem) }].concat(msgs),
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error("Groq HTTP " + response.status);
  var data = await response.json();
  var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("Groq returned no text");
  return String(text).trim();
}

async function openai(msgs, id, lang, role, mem) {
  var key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured");
  var response = await request("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + key },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [{ role: "system", content: promptFor(id, lang, role, mem) }].concat(msgs),
      temperature: 0.7,
      max_tokens: 1000
    })
  });
  if (!response.ok) throw new Error("OpenAI HTTP " + response.status);
  var data = await response.json();
  var text = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!text) throw new Error("OpenAI returned no text");
  return String(text).trim();
}

async function gemini(msgs, id, lang, role, mem) {
  var key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("Gemini is not configured");
  var contents = msgs.map(function (m) {
    return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
  });
  var model = process.env.GEMINI_MODEL || "gemini-3.6-flash";
  var response = await request("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(model) + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: contents,
      systemInstruction: { parts: [{ text: promptFor(id, lang, role, mem) }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
    })
  });
  if (!response.ok) throw new Error("Gemini HTTP " + response.status);
  var data = await response.json();
  var parts = data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts || [];
  var text = parts.map(function (p) { return p && p.text || ""; }).join("").trim();
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

var CALLERS = { groq: groq, openai: openai, gemini: gemini };

export async function generateAIReply(input) {
  var options = input || {};
  var message = String(options.message || "").trim();
  if (!message) throw new Error("Message is required.");
  var id = String(options.studentId || "");
  var lang = languageName(options.language);
  var msgs = messagesOf(options.history).concat([{ role: "user", content: message }]);
  var memories = await recallMemories(id, message);
  var route = councilRoute(message);
  var role = lang === "English" ? (options.councilRole || route.routedTo) : "LANGUAGE_ENGINE";
  var list = providers();
  if (route.status !== "PASS") throw new Error("Request blocked: " + route.reason);
  if (!list.length) throw new Error("No AI provider is configured");
  var lastError = null;

  var controlled = await runControlledTask({
    message: message,
    owner: role,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    execute: async function () {
      for (var i = 0; i < list.length; i += 1) {
        var provider = list[i];
        try {
          var text = await CALLERS[provider](msgs, id, lang, role, memories);
          var persisted = await saveMemory(id, { user: message, assistant: text, councilRole: role });
          return {
            text: text,
            sources: [],
            retrievalMode: memoryEnabled() ? (memories.length ? "long_term_memory" : "memory_enabled_no_match") : "provider_only",
            memoriesUsed: memories.length,
            memoryPersisted: persisted,
            councilRole: role,
            provider: provider,
            language: lang
          };
        } catch (error) {
          lastError = error;
          console.error("AI provider failed: " + provider, error && error.message ? error.message : error);
        }
      }
      throw new Error("All configured AI providers failed: " + (lastError && lastError.message ? lastError.message : "unknown"));
    },
    verify: function (result) {
      return Boolean(result && result.text && result.provider && result.councilRole);
    }
  });
  return controlled.result;
}
