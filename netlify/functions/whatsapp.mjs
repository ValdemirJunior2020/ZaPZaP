import crypto from "node:crypto";

const json=(statusCode,body)=>({statusCode,headers:{"Content-Type":"application/json","Cache-Control":"no-store"},body:JSON.stringify(body)});
const rawBody=event=>event.isBase64Encoded?Buffer.from(event.body||"","base64"):Buffer.from(event.body||"","utf8");
const lang=(s)=>/[ãõçáéíóúâêôà]/i.test(s)||/\b(olá|oi|vocês|preço|quanto custa|obrigad[oa]|agendar|carro|hoje)\b/i.test(s)?"pt":/[¿¡ñ]/.test(s)||/\b(hola|precio|gracias|quiero|cita|mañana|cuánto|tienen|necesito)\b/i.test(s)?"es":"en";
const busy={en:"Thanks for messaging us! We are helping other customers right now and will be with you shortly.",es:"¡Gracias por escribirnos! Estamos atendiendo a otros clientes. En breve estaremos contigo.",pt:"Obrigado por entrar em contato! Estamos atendendo outros clientes. Em breve vamos falar com você."};
const trim=(s,n)=>String(s||"").slice(0,n);
async function respondToCustomer(text){
  const language=lang(text);
  const business=trim(process.env.ZAP_BUSINESS_NAME||"our business",120);
  const hours=trim(process.env.ZAP_BUSINESS_HOURS||"",300);
  const offerings=trim(process.env.ZAP_BUSINESS_PRODUCTS||"",1800);
  if(process.env.OPENAI_API_KEY){
    const system="You are a concise WhatsApp customer service and sales assistant for "+business+". Always reply in the customer's language. Never invent prices, inventory, availability, appointments or payment confirmation. When uncertain ask to transfer to a human. Hours: "+hours+". Products: "+offerings;
    const controller=AbortSignal.timeout(8500);
    try {
      const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+process.env.OPENAI_API_KEY},body:JSON.stringify({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",messages:[{role:"system",content:system},{role:"user",content:text}],max_tokens:220,temperature:0.3}),signal:controller});
      if(r.ok){const j=await r.json();const response=j?.choices?.[0]?.message?.content;if(typeof response==="string"&&response.trim())return response.trim().slice(0,2000)}
    }catch(e){console.warn("AI fallback:",e.message)}
  }
  const offers={
    en:"Hi! Thanks for contacting "+business+". "+(offerings?"Here are our listed offerings: "+offerings+". ":"")+"What can I help you with today?",
    es:"¡Hola! Gracias por contactar a "+business+". "+(offerings?"Nuestros productos y servicios: "+offerings+". ":"")+"¿En qué podemos ayudarte?",
    pt:"Olá! Obrigado por entrar em contato com "+business+". "+(offerings?"Nossos produtos e serviços: "+offerings+". ":"")+"Como podemos ajudar?"
  };
  if(/\b(busy|wait|aguarde|espera|fila)\b/i.test(text))return busy[language];
  return offers[language];
}
async function sendText(to,body){
  const phone=process.env.WHATSAPP_PHONE_NUMBER_ID,token=process.env.WHATSAPP_ACCESS_TOKEN;
  if(!phone||!token)throw new Error("WhatsApp credentials not configured");
  const version=process.env.META_GRAPH_VERSION||"v23.0";
  const response=await fetch("https://graph.facebook.com/"+version+"/"+encodeURIComponent(phone)+"/messages",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({messaging_product:"whatsapp",to,type:"text",text:{preview_url:false,body:body.slice(0,3900)}}),signal:AbortSignal.timeout(10000)});
  if(!response.ok){const detail=await response.text();throw new Error("Meta API "+response.status+" "+detail.slice(0,300))}
  return response.json();
}
export const handler=async(event)=>{
  if(event.httpMethod==="GET"){
    const p=event.queryStringParameters||{};
    if(!process.env.WHATSAPP_VERIFY_TOKEN)return json(503,{error:"Webhook not configured"});
    if(p["hub.mode"]==="subscribe"&&p["hub.verify_token"]===process.env.WHATSAPP_VERIFY_TOKEN)return{statusCode:200,headers:{"Content-Type":"text/plain"},body:p["hub.challenge"]||""};
    return json(403,{error:"Invalid webhook verification token"});
  }
  if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
  const secret=process.env.WHATSAPP_APP_SECRET;
  if(!secret)return json(503,{error:"Webhook secret not configured"});
  const signature=event.headers?.["x-hub-signature-256"]||event.headers?.["X-Hub-Signature-256"]||"";
  const expected="sha256="+crypto.createHmac("sha256",secret).update(rawBody(event)).digest("hex");
  const a=Buffer.from(signature),b=Buffer.from(expected);
  if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return json(403,{error:"Invalid signature"});
  let payload;try{payload=JSON.parse(rawBody(event).toString("utf8"))}catch{return json(400,{error:"Invalid JSON"})}
  const incoming=(payload.entry||[]).flatMap(x=>x.changes||[]).flatMap(x=>x.value?.messages||[]).filter(x=>x.type==="text"&&x.from&&x.text?.body);
  if(!incoming.length)return json(200,{ok:true,processed:0});
  // This prototype processes incoming events synchronously. Production needs durable idempotency and a queue.
  let sent=0;
  for(const message of incoming.slice(0,3)){
    try{const reply=await respondToCustomer(trim(message.text.body,1500));await sendText(message.from,reply);sent++}catch(e){console.error("WhatsApp send error",e.message);return json(502,{ok:false,error:"WhatsApp delivery failed",sent})}
  }
  return json(200,{ok:true,processed:sent});
};
