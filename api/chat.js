import { generateAIReply } from "../lib/ai.js";
import { securityHeaders, wall, eyeEvent } from "../lib/security.js";

export default async function handler(req,res){
 securityHeaders(res);
 res.setHeader("Cache-Control","no-store");
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"})}

 const gate=wall(req,{limit:30});
 res.setHeader("X-RateLimit-Remaining",String(gate.remaining));
 if(!gate.allowed){
   eyeEvent("chat_rate_limit","high");
   return res.status(429).json({error:"Too many requests. Please try again shortly.",guard:"WALL"});
 }

 try{
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const message=typeof body.message==="string"?body.message.trim().slice(0,4000):"";
  const studentId=typeof body.student_id==="string"?body.student_id.trim().slice(0,100):"GUEST";
  const history=Array.isArray(body.history)?body.history.slice(-12):[];
  const targetLang=body.targetLanguage||"Auto";
  if(!message)return res.status(400).json({error:"Message required"});

  const BLOCKED=["make a bomb","build a bomb","make explosives","how to poison","how to hack","create malware","make poison"];
  if(BLOCKED.some(t=>message.toLowerCase().includes(t))){
    eyeEvent("unsafe_prompt_blocked","medium");
    return res.json({reply:"I cannot help with weapons, explosives, poisoning, hacking, or malware. I am K.AI.S, your safe academic helper for school and farming questions only.",safetyBlocked:true,sources:[]});
  }

  const isSwahili=(message.match(/nataka|habari|asante|homa|mkopo|kikohozi|shamba/gi)||[]).length>=1;
  const lang=targetLang==="Auto"?(isSwahili?"Kiswahili":"English"):String(targetLang).slice(0,30);
  const aiResult=await generateAIReply({message,history,language:lang,studentId});
  eyeEvent("chat_request","info");
  return res.json({reply:aiResult.text||aiResult.reply,sources:aiResult.sources||[],language:lang,retrievalMode:aiResult.retrievalMode||"gov-verified"});
 }catch(e){
  eyeEvent("chat_error","high");
  console.error("K.AI.S chat error");
  return res.status(500).json({error:"K.AI.S service error"});
 }
}
