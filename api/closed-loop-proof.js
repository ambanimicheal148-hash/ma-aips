import crypto from "node:crypto";
import { generateAIReply } from "../lib/ai.js";
import { councilRoute } from "../lib/council.js";
import { createTask, runControlledTask, persistenceStatus } from "../lib/master-control.js";

export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({ok:false,error:"Method not allowed"});}
  const expected=String(process.env.MAAIPS_PROOF_TOKEN||"").trim();
  const supplied=String(req.headers["x-maaips-proof-token"]||"").trim();
  if(!expected || !supplied || supplied!==expected)return res.status(401).json({ok:false,error:"PROOF_TOKEN_REQUIRED"});
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const objective=String(body.objective||"Create a short same-day business poster offer for a test shop.").trim().slice(0,1000);
  const correlationId=crypto.randomUUID();
  const stages=[];
  const add=(stage,status,detail={})=>stages.push({stage,status,at:new Date().toISOString(),...detail});
  try{
    add("DETECT","DONE",{correlationId,input:objective});
    const council=councilRoute(objective);
    if(council.status==="BLOCK")throw new Error("COUNCIL_BLOCKED");
    add("REASON","DONE",{routedTo:council.routedTo,approvalRequired:Boolean(council.approvalRequired)});
    const controlled=await runControlledTask({
      message:objective,
      owner:council.routedTo,
      execute:()=>generateAIReply({
        message:objective,
        language:body.language||"English",
        studentId:"MAAIPS_PROOF",
        councilRole:council.routedTo
      }),
      verify:(result)=>Boolean(result&&result.text&&result.provider&&result.councilRole)
    });
    add("ACT","DONE",{provider:controlled.result.provider,councilRole:controlled.result.councilRole,taskId:controlled.task.id});
    const verified=Boolean(controlled.result.text&&controlled.result.text.trim().length>=20);
    if(!verified)throw new Error("OUTPUT_VERIFICATION_FAILED");
    add("VERIFY","DONE",{criteria:["non-empty output","provider identified","council role identified"],result:"PASS"});
    add("RECOVER","NOT_NEEDED",{fallback:"Provider fallback is handled inside generateAIReply"});
    const memory=persistenceStatus();
    add("LEARN",memory.enabled?"DONE":"LIMITED",{memoryBackend:memory.backend,memoryPersistence:controlled.result.memoryPersisted});
    return res.status(200).json({
      ok:true,
      claim_status:"RUNTIME_PROOF_EXECUTED",
      system:"MA.AI.PS",
      correlationId,
      loop:"DETECT→REASON→ACT→VERIFY→RECOVER→LEARN",
      closedLoop:true,
      council:council.routedTo,
      provider:controlled.result.provider,
      output:controlled.result.text,
      stages
    });
  }catch(error){
    add("RECOVER","FAILED",{error:String(error?.message||error)});
    return res.status(502).json({ok:false,claim_status:"RUNTIME_PROOF_FAILED",correlationId,closedLoop:false,stages,error:String(error?.message||error)});
  }
}
