import { generateAIReply } from "../lib/ai.js";
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"})}
 try{
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const message=typeof body.message==="string"?body.message.trim():"";
  const studentId=typeof body.student_id==="string"?body.student_id.trim().slice(0,100):"GUEST";
  const history=Array.isArray(body.history)?body.history.slice(-12):[];
  const targetLang=body.targetLanguage||"Auto";
  if(!message)return res.status(400).json({error:"Message required"});
  const BLOCKED=["make a bomb","build a bomb","make explosives","how to poison","how to hack","create malware","make poison"];
  if(BLOCKED.some(t=>message.toLowerCase().includes(t))){
    return res.json({reply:"I cannot help with weapons, explosives, poisoning, hacking, or malware. I am K.AI.S, your safe academic helper for school and farming questions only.",safetyBlocked:true,sources:[]});
  }
  const isSwahili=(message.match(/nataka|habari|asante|homa|mkopo|kikohozi|shamba/gi)||[]).length>=1;
  const lang=targetLang==="Auto"?(isSwahili?"Kiswahili":"English"):targetLang;
  const aiResult=await generateAIReply({message,history,language:lang,studentId});
  return res.json({reply:aiResult.text||aiResult.reply,sources:aiResult.sources||[],language:lang,retrievalMode:aiResult.retrievalMode||"gov-verified"});
 }catch(e){console.error(e);return res.status(500).json({error:"K.AI.S error: "+e.message})}
}
