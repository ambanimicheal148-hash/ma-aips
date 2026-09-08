const MAX_MEMORIES = 80;
const MAX_MEMORY_CHARS = 3000;

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";
  return { url: url.replace(/\/$/, ""), token };
}

function keyFor(studentId) {
  const safe = String(studentId || "GUEST").trim().replace(/[^a-zA-Z0-9_.:-]/g, "_").slice(0, 100) || "GUEST";
  return `kais:memory:${safe}`;
}

async function command(command) {
  const { url, token } = config();
  if (!url || !token) return null;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ command })
  });
  if (!response.ok) throw new Error(`Memory store request failed: ${response.status}`);
  const data = await response.json();
  return data?.result ?? null;
}

export function memoryEnabled() {
  const { url, token } = config();
  return Boolean(url && token);
}

export async function recallMemories(studentId, query = "") {
  if (!memoryEnabled()) return [];
  try {
    const raw = await command(["LRANGE", keyFor(studentId), "0", String(MAX_MEMORIES - 1)]);
    const items = Array.isArray(raw) ? raw : [];
    const memories = items.map(item => {
      try { return JSON.parse(item); } catch { return null; }
    }).filter(Boolean);

    const terms = String(query).toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 12);
    if (!terms.length) return memories.slice(0, 12);

    const scored = memories.map(memory => {
      const haystack = `${memory.user || ""} ${memory.assistant || ""} ${memory.date || ""}`.toLowerCase();
      const score = terms.reduce((n, term) => n + (haystack.includes(term) ? 1 : 0), 0);
      return { memory, score };
    });

    return scored.sort((a, b) => b.score - a.score).filter(x => x.score > 0).slice(0, 12).map(x => x.memory);
  } catch (error) {
    console.error("K.AI.S memory recall failed:", error);
    return [];
  }
}

export async function saveMemory(studentId, { user, assistant, councilRole = "CORE", sources = [] } = {}) {
  if (!memoryEnabled()) return false;
  const cleanUser = String(user || "").trim().slice(0, MAX_MEMORY_CHARS);
  const cleanAssistant = String(assistant || "").trim().slice(0, MAX_MEMORY_CHARS);
  if (!cleanUser || !cleanAssistant) return false;

  const record = JSON.stringify({
    date: new Date().toISOString(),
    user: cleanUser,
    assistant: cleanAssistant,
    councilRole: String(councilRole || "CORE").slice(0, 100),
    sources: Array.isArray(sources) ? sources.slice(0, 10) : []
  });

  try {
    await command(["LPUSH", keyFor(studentId), record]);
    await command(["LTRIM", keyFor(studentId), "0", String(MAX_MEMORIES - 1)]);
    return true;
  } catch (error) {
    console.error("K.AI.S memory save failed:", error);
    return false;
  }
}

export function formatMemories(memories = []) {
  return memories.map((m, i) => {
    const date = m.date ? new Date(m.date).toISOString() : "unknown date";
    return `[Memory ${i + 1} | ${date}] User: ${m.user}\nAssistant: ${m.assistant}`;
  }).join("\n\n");
}
