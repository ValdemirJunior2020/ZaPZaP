import crypto from "node:crypto";
import{env,db,json,entitlement,access,offerings}from "../lib/tenant.mjs";
import{businessMessages}from"../lib/business-ai.mjs";
import{query as ollamaQuery,ready as ollamaReady}from"../lib/ollama.mjs";
import{allow}from"../lib/abuse.mjs";
const raw=e=>e.isBase64Encoded?Buffer.from(e.body||"","base64"):Buffer.from(e.body||"","utf8");
const cap=(v,n)=>String(v||"").slice(0,n);
const graphVersion=()=>/^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION||"")?process.env.META_GRAPH_VERSION:"v23.0";
const validMetaId=x=>/^[0-9]{5,30}$/.test(x||"");
async function sendText(phoneId,to,body){
 const token=process.env.WHATSAPP_ACCESS_TOKEN||"";
 if(!token)throw Error("WhatsApp access token unavailable");
 const r=await fetch("https://graph.facebook.com/"+graphVersion()+"/"+encodeURIComponent(phoneId)+"/messages",{
  method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
  body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{preview_url:false,body:cap(body,3900)}}),
  signal:AbortSignal.timeout(13000)
 });
 if(!r.ok)throw Error("Meta outbound HTTP "+r.status);
}
async function channel(c,phoneId){
 const rows=await db(c,"nx_whatsapp_channels?phone_number_id=eq."+encodeURIComponent(phoneId)+"&enabled=eq.true&select=store_id");
 const ch=rows?.[0];if(!ch)return null;
 const stores=await db(c,"nx_stores?id=eq."+encodeURIComponent(ch.store_id)+"&published=eq.true&select=*");
 const store=stores?.[0];if(!store)return null;
 const ent=await entitlement(c,store.owner_id);
 return access(ent).allowed?{store,ent}:null;
}
async function processMessage(c,phoneId,message){
 const found=await channel(c,phoneId);
 if(!found){console.warn("WhatsApp phone number unmapped or inactive");return false}
 const id=cap(message.id,200),text=cap(message.text?.body,700),from=cap(message.from,35);
 if(!id||!text||!/^\d{7,20}$/.test(from))return false;
 const claimed=await db(c,"rpc/nx_claim_whatsapp_message",{method:"POST",body:{p_message_id:id,p_store_id:found.store.id}});
 if(claimed!==true)return false; // Never send twice on duplicate webhook delivery.
 const update=async status=>db(c,"nx_whatsapp_messages?message_id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status},prefer:"return=minimal"});
 try{
  if(!ollamaReady())throw Error("Ollama gateway offline");
  if(!await allow(c,"whatsapp",phoneId+":"+from,20,3600))throw Error("WhatsApp client budget reached");
  const max=found.ent.subscription_status==="ACTIVE"?1000:100;
  const allowed=await db(c,"rpc/nx_consume_chat_quota",{method:"POST",body:{p_store_id:found.store.id,p_cap:max}});
  if(allowed!==true)throw Error("Store AI budget reached");
  const products=await offerings(c,found.store.id);
  const prompts=businessMessages(found.store,products,text);
  const answer=await ollamaQuery(prompts,{maxTokens:280,timeoutMs:18000});
  await sendText(phoneId,from,answer);
  await update("sent");
  return true;
 }catch(e){
  console.error("WhatsApp message not delivered:",e.message);
  await update("failed").catch(()=>{});
  return false;
 }
}
export async function handler(event){
 if(event.httpMethod==="GET"){
  const p=event.queryStringParameters||{};
  if(!process.env.WHATSAPP_VERIFY_TOKEN)return json(503,{error:"Webhook not configured"});
  if(p["hub.mode"]==="subscribe"&&p["hub.verify_token"]===process.env.WHATSAPP_VERIFY_TOKEN)
    return{statusCode:200,headers:{"Content-Type":"text/plain"},body:p["hub.challenge"]||""};
  return json(403,{error:"Invalid verification token"});
 }
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!process.env.WHATSAPP_APP_SECRET)return json(503,{error:"Webhook not configured"});
 const body=raw(event);if(body.length>250000)return json(413,{error:"Payload too large"});
 const sig=event.headers?.["x-hub-signature-256"]||event.headers?.["X-Hub-Signature-256"]||"";
 const expected="sha256="+crypto.createHmac("sha256",process.env.WHATSAPP_APP_SECRET).update(body).digest("hex");
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return json(403,{error:"Invalid signature"});
 let payload;try{payload=JSON.parse(body.toString("utf8"))}catch{return json(400,{error:"Invalid JSON"})}
 if(payload.object!=="whatsapp_business_account")return json(200,{received:true});
 const changes=(payload.entry||[]).flatMap(x=>x.changes||[]);
 let received=0,delivered=0;
 const c=env();
 for(const change of changes){
  const phoneId=String(change.value?.metadata?.phone_number_id||"");
  if(!validMetaId(phoneId))continue;
  // One configured Meta number maps to exactly one verified NexusSales tenant.
  const messages=(change.value?.messages||[]).filter(m=>m?.type==="text"&&m.id&&m.from&&m.text?.body);
  for(const message of messages.slice(0,3)){
   received++;
   try{if(await processMessage(c,phoneId,message))delivered++}
   catch(e){console.error("WhatsApp request failed:",e.message)}
  }
 }
 return json(200,{received:true,messages:received,delivered});
}
