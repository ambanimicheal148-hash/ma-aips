import { generateAIReply } from "../lib/ai.js";
import { councilRoute } from "../lib/council.js";
const MAX_MESSAGE_LENGTH=4000;
export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 try{
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const message=typeof body.message==="string"?body.message.trim():"";
  const history=Array.isArray(body.history)?body.history.slice(-12):[];
  const language=typeof body.language==="string"?body.language.trim().slice(0,40):"English";
  const memoryId=typeof body.memory_id==="string"?body.memory_id.trim().slice(0,100):"MASTER";
  if(!message)return res.status(400).json({error:"Message required"});
  if(message.length>MAX_MESSAGE_LENGTH)return res.status(413).json({error:"Message too long"});
  const council=councilRoute(message);
  if(council.status==="BLOCK")return res.status(400).json({routedTo:council.routedTo,employee:council.routedTo,approvalRequired:false,council,reply:"I cannot help with that request.",retrievalMode:"blocked"});
  try{
   const aiResult=await generateAIReply({message,history,language,studentId:memoryId,councilRole:council.routedTo});
   return res.status(200).json({routedTo:council.routedTo,employee:council.routedTo,approvalRequired:council.approvalRequired,council,reply:aiResult?.text||"No response received.",language,retrievalMode:aiResult?.retrievalMode||"provider_only",memoriesUsed:aiResult?.memoriesUsed||0,memoryPersisted:Boolean(aiResult?.memoryPersisted)});
  }catch(error){console.error("K.AI.S MASTER PROVIDER ERROR:",error);return res.status(503).json({routedTo:council.routedTo,employee:council.routedTo,approvalRequired:council.approvalRequired,council,error:"AI provider unavailable"});}
 }catch(error){console.error("K.AI.S MASTER ERROR:",error);return res.status(500).json({error:"K.AI.S MASTER error"});}
}
