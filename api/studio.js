import { createStudioAd } from "../lib/studio.js";

export default async function handler(req,res){
 if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
 try{const body=req.body&&typeof req.body==="object"?req.body:{};const result=await createStudioAd(body);return res.status(200).json(result);}catch(error){console.error("Creative Studio render failed:",error);return res.status(500).json({error:"Creative Studio render failed",detail:error?.message||String(error)});}
}
