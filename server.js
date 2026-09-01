import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;

// ===== MEMORY =====
const sessions = new Map();
function saveChat(sid, role, content){
  if(!sessions.has(sid)) sessions.set(sid, []);
  const arr = sessions.get(sid);
  arr.push({role, content, time: Date.now()});
  if(arr.length > 30) arr.shift();
}
function getHistory(sid, limit=8){
  return (sessions.get(sid) || []).slice(-limit).map(m=>({role: m.role, content: m.content}));
}

// ===== AI SERVICE =====
async function generateAIResponse(messages, options={}){
  const key = process.env.OPENAI_API_KEY;
  if(!key) throw new Error("AI not configured");
  const client = new OpenAI({ apiKey: key });
  const resp = await client.chat.completions.create({
    model: options.model || "gpt-4o-mini",
    messages,
    temperature: options.temperature?? 0.7,
    max_tokens: options.max_tokens || 1000
  });
  return resp.choices[0].message.content.trim();
}

// ===== HEALTH =====
app.get("/api/health", (req,res)=>{
  res.json({ status: "ok", platform: "MA.AI.P.S", version: "1.0.0", uptime: process.uptime() });
});

app.get("/api/kais/languages", (req,res)=>{
  res.json({
    success: true,
    languages: [
      { code: "en", name: "English" },
      { code: "sw", name: "Kiswahili" },
      { code: "sheng", name: "Sheng" },
      { code: "luo", name: "Dholuo" },
      { code: "kik", name: "Kikuyu" },
      { code: "luh", name: "Luhya" },
      { code: "kal", name: "Kalenjin" },
      { code: "kam", name: "Kamba" },
      { code: "kisii", name: "Kisii" },
      { code: "so", name: "Somali" },
      { code: "mas", name: "Maasai" }
    ]
  });
});

// ===== MCB COACH AI =====
app.post("/api/mcb/chat", async (req,res)=>{
  try{
    const { message, session_id="mcb-default" } = req.body;
    if(!message || typeof message!== "string" ||!message.trim()) return res.status(400).json({success:false, error:"message is required"});
    if(message.length > 4000) return res.status(400).json({success:false, error:"message max 4000"});

    const history = getHistory(session_id);
    const messages = [
      { role: "system", content: "You are MCB Coach AI, part of MA.AI.P.S (Michael Ambani Artificial Intelligence Platform System). You are a practical Business and Digital Growth Coach. Help entrepreneurs and small businesses with business ideas, digital marketing, sales, customer acquisition, productivity, AI adoption, websites, digital products, strategy. Give realistic actionable advice. Never guarantee profits. Give numbered steps when useful. Never pretend to be government official, lawyer, doctor, banker." },
     ...history,
      { role: "user", content: message }
    ];
    const reply = await generateAIResponse(messages, { temperature: 0.7 });
    saveChat(session_id, "user", message);
    saveChat(session_id, "assistant", reply);
    res.json({ success: true, reply });
  } catch(e){
    console.error("MCB error", e.message);
    res.status(500).json({ success:false, error:"The AI service is temporarily unavailable. Please try again." });
  }
});

// ===== K.AI.S =====
app.post("/api/kais/chat", async (req,res)=>{
  try{
    const { message, session_id="kais-default", language="en" } = req.body;
    if(!message ||!message.trim()) return res.status(400).json({success:false, error:"message is required"});

    const history = getHistory(session_id);
    const messages = [
      { role: "system", content: `You are K.AI.S - Kenya AI Service, part of MA.AI.P.S. You are an independent tech platform helping Kenyan citizens find and understand public information. IMPORTANT: You are NOT the Government of Kenya. Clearly distinguish OFFICIAL GOVERNMENT INFORMATION from AI-GENERATED EXPLANATION. NEVER invent policies, fees, deadlines, eligibility. Prioritize verified sources like eCitizen, KRA, Huduma Kenya, ministry websites. If you cannot verify, say so. Respond in language: ${language}. Structure: 1) Answer 2) Source/verification 3) What citizen should do next. Say when info may have changed.` },
     ...history,
      { role: "user", content: message }
    ];
    const reply = await generateAIResponse(messages, { temperature: 0.3 });
    saveChat(session_id, "user", message);
    saveChat(session_id, "assistant", reply);
    res.json({
      success: true,
      reply,
      disclaimer: "K.AI.S is independent, not Government of Kenya. Verify with official sources: eCitizen, Huduma Centres.",
      language
    });
  } catch(e){
    console.error("KAIS error", e.message);
    res.status(500).json({ success:false, error:"The AI service is temporarily unavailable. Please try again." });
  }
});

// ===== MBNA =====
app.post("/api/mbna/program", async (req,res)=>{
  try{
    const { niche, goal, days } = req.body;
    if(!niche || niche.length > 200) return res.status(400).json({success:false, error:"niche required max 200"});
    if(!goal || goal.length > 500) return res.status(400).json({success:false, error:"goal required max 500"});
    const d = parseInt(days,10);
    if(isNaN(d) || d < 1 || d > 365) return res.status(400).json({success:false, error:"days must be 1-365"});

    const prompt = `Create a structured coaching program. Niche: ${niche}, Goal: ${goal}, Days: ${d}. Return ONLY valid JSON in this exact format: {"title":"...","goal":"...","days":[{"day":1,"lesson":"...","action":"..."}]}. No extra text.`;

    const raw = await generateAIResponse([{role:"user", content: prompt}], { temperature: 0.6, max_tokens: 2000 });

    let parsed;
    try{
      const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
      parsed = JSON.parse(jsonStr);
    } catch{
      return res.status(500).json({success:false, error:"AI returned malformed program, please retry"});
    }
    res.json({ success: true, program: parsed });
  } catch(e){
    console.error("MBNA error", e.message);
    res.status(500).json({ success:false, error:"Unable to generate program now. Try again." });
  }
});

// Fallback
app.get("*", (req,res)=>{
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, ()=> console.log(`MA.AI.P.S running on ${PORT}`));
