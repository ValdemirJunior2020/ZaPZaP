import crypto from"node:crypto";
import{env,db,json}from"../lib/tenant.mjs";
const raw=e=>e.isBase64Encoded?Buffer.from(e.body||"","base64"):Buffer.from(e.body||"","utf8");
const validId=x=>/^[0-9]{5,30}$/.test(x||"");
export async function handler(event){
 if(event.httpMethod==="GET"){
  const q=event.queryStringParameters||{};
  if(!process.env.WHATSAPP_VERIFY_TOKEN)return json(503,{error:"Webhook not configured"});
  if(q["hub.mode"]==="subscribe"&&q["hub.verify_token"]===process.env.WHATSAPP_VERIFY_TOKEN)
   return{statusCode:200,headers:{"Content-Type":"text/plain"},body:q["hub.challenge"]||""};
  return json(403,{error:"Invalid verification token"});
 }
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 const secret=process.env.WHATSAPP_APP_SECRET;
 if(!secret)return json(503,{error:"Webhook secret missing"});
 const body=raw(event);if(body.length>250000)return json(413,{error:"Payload too large"});
 const sig=event.headers?.["x-hub-signature-256"]||event.headers?.["X-Hub-Signature-256"]||"";
 const expected="sha256="+crypto.createHmac("sha256",secret).update(body).digest("hex");
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return json(403,{error:"Invalid signature"});
 let input;try{input=JSON.parse(body.toString("utf8"))}catch{return json(400,{error:"Invalid JSON"})}
 if(input.object!=="whatsapp_business_account")return json(200,{received:true,queued:0});
 let queued=0,duplicates=0,ignored=0;
 try{
  const c=env();
  const events=(input.entry||[]).flatMap(e=>e.changes||[]);
  for(const event of events){
   const phone=String(event.value?.metadata?.phone_number_id||"");
   if(!validId(phone))continue;
   const channels=await db(c,"nx_whatsapp_channels?phone_number_id=eq."+encodeURIComponent(phone)+"&enabled=eq.true&select=store_id");
   const storeId=channels?.[0]?.store_id;
   if(!storeId){ignored++;continue}
   const messages=(event.value?.messages||[]).filter(m=>m.type==="text"&&m.id&&m.text?.body&&m.from);
   for(const message of messages.slice(0,10)){
    const msg=String(message.text.body).slice(0,700),sender=String(message.from).slice(0,30);
    const id=String(message.id).slice(0,200);
    const inserted=await db(c,"rpc/nx_enqueue_whatsapp",{method:"POST",body:{
     p_message_id:id,p_store_id:storeId,p_phone_id:phone,p_sender:sender,p_text:msg
    }});
    if(inserted===true)queued++;else duplicates++;
   }
  }
  // ACK only after the database confirms durable persistence.
  return json(200,{received:true,queued,duplicates,ignored});
 }catch(e){
  console.error("WhatsApp enqueue failed:",e.message);
  // Let Meta retry the original notification; duplicate IDs are idempotent.
  return json(503,{error:"Unable to persist incoming WhatsApp message"});
 }
}