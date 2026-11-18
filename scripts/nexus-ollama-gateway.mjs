// NexusSales local-only authenticated reverse gateway for Ollama.
// Listen strictly on 127.0.0.1; Cloudflare Tunnel may privately forward to this port.
// Do not expose port 8789 via router/firewall, and never expose 11434 publicly.
import http from "node:http";
import crypto from "node:crypto";
import {readFileSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
try{process.loadEnvFile(path.join(root,".env.local"))}catch(e){if(e?.code!=="ENOENT")console.error("Could not load private local environment");}
const host="127.0.0.1";
const port=8789;
const secret=process.env.NEXUS_OLLAMA_GATEWAY_TOKEN||"";
if(secret.length<24){
 console.error("Gateway not started: NEXUS_OLLAMA_GATEWAY_TOKEN must exist in private .env.local (min 24 characters).");
 process.exit(1);
}
const expected=Buffer.from(secret,"utf8");
const models=new Set([
 process.env.NEXUS_OLLAMA_MODEL||"qwen3:8b",
 process.env.NEXUS_OLLAMA_SECONDARY_MODEL||"qwen3:4b"
]);
function auth(req){
 const h=req.headers.authorization||"";
 if(typeof h!=="string"||!h.startsWith("Bearer "))return false;
 const supplied=Buffer.from(h.slice(7),"utf8");
 return supplied.length===expected.length && crypto.timingSafeEqual(supplied,expected);
}
function reply(res,status,obj){
 const body=JSON.stringify(obj);
 res.writeHead(status,{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
 res.end(body);
}
const bad=new Map();
function limited(req){
 const ip=req.socket.remoteAddress||"unknown";
 const now=Date.now(),slot=bad.get(ip)||{since:now,count:0};
 if(now-slot.since>60000){slot.since=now;slot.count=0}
 slot.count+=1;bad.set(ip,slot);
 if(bad.size>100){for(const [id,x] of bad){if(now-x.since>60000)bad.delete(id)}}
 return slot.count>90;
}
async function body(req){
 let length=0;const chunks=[];
 for await(const chunk of req){
  length+=chunk.length;
  if(length>35000)throw Object.assign(new Error("Request too large"),{httpStatus:413});
  chunks.push(chunk);
 }
 try{return JSON.parse(Buffer.concat(chunks).toString("utf8"))}catch{throw Object.assign(new Error("Invalid JSON"),{httpStatus:400})}
}
const server=http.createServer(async(req,res)=>{
 const pathname=(req.url||"").split("?")[0];
 if(req.method==="GET"&&pathname==="/health")return reply(res,200,{ok:true,service:"nexus-local-gateway"});
 if(req.method!=="POST"||pathname!=="/api/chat")return reply(res,404,{error:"Not found"});
 if(!auth(req))return reply(res,401,{error:"Unauthorized"});
 if(limited(req))return reply(res,429,{error:"Local gateway rate limit"});
 try{
  const input=await body(req);
  if(!input||typeof input!=="object"||!models.has(input.model)||!Array.isArray(input.messages)||input.messages.length>20)
   return reply(res,400,{error:"Invalid AI request"});
  const messages=input.messages.map(m=>({role:m?.role,content:m?.content}));
  if(messages.some(m=>!["system","user","assistant"].includes(m.role)||typeof m.content!=="string"||m.content.length>16000))
   return reply(res,400,{error:"Invalid messages"});
  const count=Number(input.options?.num_predict);
  const num_predict=Number.isSafeInteger(count)?Math.max(25,Math.min(count,500)):350;
  const forward=await fetch("http://127.0.0.1:11434/api/chat",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({model:input.model,messages,stream:false,think:false,options:{temperature:0.25,num_predict}}),
   signal:AbortSignal.timeout(90000)
  });
  if(!forward.ok){
   if(forward.status===404)return reply(res,404,{error:"Local Ollama model not found"});
   return reply(res,forward.status===429?429:503,{error:"Ollama temporarily unavailable"});
  }
  const response=await forward.json();
  reply(res,200,{model:input.model,message:{role:"assistant",content:String(response?.message?.content||"").slice(0,3500)},done:true});
 }catch(err){
  reply(res,Number(err?.httpStatus)||503,{error:err?.httpStatus?"Invalid request":"Local inference unavailable"});
 }
});
server.requestTimeout=100000;
server.headersTimeout=12000;
server.listen(port,host,()=>console.log("NexusSales protected Ollama gateway listening at http://"+host+":"+port+" (token required for /api/chat)"));
