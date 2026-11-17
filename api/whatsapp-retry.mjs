// Secured worker trigger. A private CRON_SECRET is always required.
import{executeOnce}from"../netlify/lib/whatsapp-delivery.mjs";
import crypto from"node:crypto";
export default async function handler(request,response){
 const write=(status,body)=>{
  if(response){response.writeHead(status,{"Content-Type":"application/json","Cache-Control":"no-store"});response.end(JSON.stringify(body));return}
  return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
 };
 if(request.method!=="GET"&&request.method!=="POST")return write(405,{error:"Method not allowed"});
 const configured=process.env.CRON_SECRET||"";
 const header=typeof request.headers?.get==="function"?(request.headers.get("authorization")||""):(request.headers?.authorization||"");
 const expected="Bearer "+configured;
 const allowed=configured.length>=32&&header.length===expected.length&&crypto.timingSafeEqual(Buffer.from(header),Buffer.from(expected));
 if(!allowed)return write(401,{error:"Unauthorized"});
 try{return write(200,{ok:true,result:await executeOnce()})}
 catch(e){console.error("WhatsApp retry worker:",String(e.message).slice(0,170));return write(503,{error:"Worker temporarily unavailable"})}
}
