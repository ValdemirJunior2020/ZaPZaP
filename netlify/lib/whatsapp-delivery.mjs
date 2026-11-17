import{env,db,entitlement,access,offerings}from"./tenant.mjs";
import{businessMessages}from"./business-ai.mjs";
import{query as ollamaQuery,ready as ollamaReady}from"./ollama.mjs";
import{allow}from"./abuse.mjs";
const graphVersion=()=>/^v\d+\.\d+$/.test(process.env.META_GRAPH_VERSION||"")?process.env.META_GRAPH_VERSION:"v23.0";
async function sendText(phone,to,reply){
 const token=process.env.WHATSAPP_ACCESS_TOKEN||"";
 if(!token)throw Error("Meta access token unavailable");
 const r=await fetch("https://graph.facebook.com/"+graphVersion()+"/"+encodeURIComponent(phone)+"/messages",{
  method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
  body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{preview_url:false,body:reply.slice(0,3900)}}),
  signal:AbortSignal.timeout(6500)
 });
 if(!r.ok)throw Error("Meta response HTTP "+r.status);
}
async function executeOnce(){
 const c=env();
 // Atomically claim one due delivery across instances. Old processing leases are recovered.
 const jobs=await db(c,"rpc/nx_claim_next_whatsapp",{method:"POST",body:{}});
 const job=Array.isArray(jobs)?jobs[0]:null;
 if(!job)return{processed:0};
 let ok=false,why="";
 try{
  const ch=await db(c,"nx_whatsapp_channels?phone_number_id=eq."+encodeURIComponent(job.phone_number_id)+"&enabled=eq.true&select=store_id");
  if(ch?.[0]?.store_id!==job.store_id)throw Error("WhatsApp channel disabled or remapped");
  const stores=await db(c,"nx_stores?id=eq."+encodeURIComponent(job.store_id)+"&published=eq.true&select=*");
  const store=stores?.[0];if(!store)throw Error("Business not published");
  const ent=await entitlement(c,store.owner_id);if(!access(ent).allowed)throw Error("Business trial/subscription inactive");
  if(!ollamaReady())throw Error("Ollama gateway offline");
  if(!await allow(c,"whatsapp",job.phone_number_id+":"+job.sender_phone,20,3600))throw Error("WhatsApp abuse budget reached");
  const quota=ent.subscription_status==="ACTIVE"?1000:100;
  if(await db(c,"rpc/nx_consume_chat_quota",{method:"POST",body:{p_store_id:store.id,p_cap:quota}})!==true)
    throw Error("Business daily message limit reached");
  const items=await offerings(c,store.id);
  const answer=await ollamaQuery(businessMessages(store,items,job.incoming_text),{maxTokens:260,timeoutMs:14500});
  await sendText(job.phone_number_id,job.sender_phone,answer);
  ok=true;
 }catch(e){why=String(e.message||"delivery unavailable").slice(0,240);console.error("WhatsApp queued delivery:",why)}
 const settled=await db(c,"rpc/nx_finish_whatsapp",{method:"POST",body:{p_message_id:job.message_id,p_lease_id:job.lease_id,p_success:ok,p_error:why||null}});
 if(settled!==true)console.error("WhatsApp lease settlement failed",job.message_id);
 return{processed:1,delivered:ok&&settled===true?1:0,failed:ok?0:1,attempts:job.attempts};
}
export{executeOnce};