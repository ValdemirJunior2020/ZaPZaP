// Hosted NexusSales AI gateway for a business storefront preview.
// Remains disabled until a trusted server provider and published tenant data exist.
const reply=(status,obj)=>({statusCode:status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},body:JSON.stringify(obj)});
const last=new Map();
const clip=(x,n)=>String(x??"").slice(0,n).trim();
function limited(ip){
 const now=Date.now(),x=(last.get(ip)||[]).filter(t=>now-t<60000);x.push(now);last.set(ip,x);
 if(last.size>3000)for(const[k,v]of last)if(!v.length||v.at(-1)<now-60000)last.delete(k);
 return x.length<=8;
}
export async function handler(event){
 if(event.httpMethod==="GET")return reply(200,{online:process.env.NEXUS_LIVE_CHAT_ENABLED==="true"&&!!process.env.OPENAI_API_KEY});
 if(event.httpMethod!=="POST")return reply(405,{error:"Method not allowed"});
 const origin=event.headers.origin||event.headers.Origin||"",host=event.headers.host||"";
 if(origin!=="https://"+host)return reply(403,{error:"Origin rejected"});
 if(process.env.NEXUS_LIVE_CHAT_ENABLED!=="true"||!process.env.OPENAI_API_KEY)return reply(503,{error:"Live AI is not connected"});
 if(!event.body||event.body.length>16000)return reply(413,{error:"Request too large"});
 const ip=event.headers["x-nf-client-connection-ip"]||"unknown";
 if(!limited(ip))return reply(429,{error:"Please try again shortly"});
 let data;try{data=JSON.parse(event.body)}catch{return reply(400,{error:"Invalid request"})}
 const question=clip(data.message,700);if(!question)return reply(400,{error:"Question required"});
 const business=data.business||{},catalog=Array.isArray(data.catalog)?data.catalog.slice(0,35):[];
 const items=catalog.map(p=>({name:clip(p.name,130),type:clip(p.type,30),price:clip(p.price,70),description:clip(p.description,300),availability:clip(p.availability,50)}));
 const system="You are a friendly, professional business sales and support assistant. Answer only from the business information given, in the customer's language. Do not invent inventory, prices, operating hours, bookings, promises, refunds, discounts or company details. If information is missing, state it is unconfirmed and offer the contact inquiry form. Keep answers concise and helpful; do not claim an inquiry was submitted. You cannot send emails or schedule appointments. Business information supplied by an owner preview (not verified): "+JSON.stringify({name:clip(business.name,140),description:clip(business.description,1200),hours:clip(business.hours,150),offerings:items}).slice(0,12000);
 const history=Array.isArray(data.history)?data.history.slice(-8).filter(x=>x?.role==="user"||x?.role==="assistant").map(x=>({role:x.role,content:clip(x.content,500)})):[];
 try{
  const res=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.NEXUS_CHAT_MODEL||"gpt-4.1-mini",messages:[{role:"system",content:system},...history,{role:"user",content:question}],temperature:.3,max_tokens:350}),signal:AbortSignal.timeout(18000)});
  if(!res.ok)throw Error("Provider status "+res.status);
  const j=await res.json();const text=clip(j?.choices?.[0]?.message?.content,2200);
  if(!text)throw Error("Empty provider answer");
  return reply(200,{reply:text,source:"ai"});
 }catch(err){console.error("Store AI gateway:",err.message);return reply(503,{error:"The assistant is temporarily unavailable"})}
}