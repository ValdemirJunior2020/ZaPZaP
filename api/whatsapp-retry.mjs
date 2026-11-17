// Secured worker trigger. Use a trusted scheduler with a private CRON_SECRET.
// No client can use this endpoint to dispatch WhatsApp messages anonymously.
import{executeOnce}from"../netlify/lib/whatsapp-delivery.mjs";
import crypto from"node:crypto";
export default async function handler(request){
 if(request.method!=="GET"&&request.method!=="POST")return Response.json({error:"Method not allowed"},{status:405});
 const configured=process.env.CRON_SECRET||"";
 const header=request.headers.get("authorization")||"";
 const expected="Bearer "+configured;
 const allowed=configured.length>=32&&header.length===expected.length&&crypto.timingSafeEqual(Buffer.from(header),Buffer.from(expected));
 if(!allowed)return Response.json({error:"Unauthorized"},{status:401});
 try{
  const result=await executeOnce();
  return Response.json({ok:true,result},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  console.error("WhatsApp retry worker:",String(e.message).slice(0,170));
  return Response.json({error:"Worker temporarily unavailable"},{status:503});
 }
}
