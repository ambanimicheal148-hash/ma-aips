import { createFullTrack } from "../lib/studio-track.js";

export default async function handler(req,res){
  if(req.method!=="POST"){res.setHeader("Allow","POST");return res.status(405).json({error:"Method not allowed"});}
  try{
    const body=req.body&&typeof req.body==="object"?req.body:{};
    const result=await createFullTrack(body);
    return res.status(200).json(result);
  }catch(error){
    console.error("Full track render failed:",error);
    return res.status(500).json({error:"Full track render failed",detail:error?.message||String(error)});
  }
}
