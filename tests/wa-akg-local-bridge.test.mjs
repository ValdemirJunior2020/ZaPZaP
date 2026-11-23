import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {validSession,validJid,normalizeMessage,approvedSender,buildPrompt,safeCustomerReply,localSafeFallback,withNexusWhatsAppIdentity,looksLikeNexusAutoReply,makeReplySafety,startBridge} from "../scripts/wa-akg-local-bridge.mjs";

test("validates sessions, WhatsApp personal JIDs and safe messages",()=>{
 assert.equal(validSession("nexus-local-x"),true);
 assert.equal(validSession("../admin"),false);
 assert.equal(validJid("15551234567@s.whatsapp.net"),true);
 assert.equal(validJid("100000@g.us"),false);
 assert.equal(normalizeMessage({fromMe:false,type:"TEXT",content:" hi ",remoteJid:"15551234567@s.whatsapp.net",keyId:"x"}).text,"hi");
 assert.equal(normalizeMessage({fromMe:true,type:"TEXT",content:"x",remoteJid:"15551234567@s.whatsapp.net",keyId:"y"}),null);
 assert.equal(approvedSender("15551234567@s.whatsapp.net",new Set(["15551234567"])),true);
 assert.equal(approvedSender("15551234567@s.whatsapp.net",new Set(["15557654321"])),false);
 assert.equal(approvedSender("15551234567@s.whatsapp.net",new Set(),"all"),true);
 assert.equal(approvedSender("120363123456@g.us",new Set(),"all"),false);
 assert.equal(approvedSender("status@broadcast",new Set(),"all"),false);
 assert.match(buildPrompt("Test Garage","When are you open?")[0].content,/Never invent opening hours/);
});

test("local gateway uses mock WA-AKG: starts OFF, limits testing to allowlist, and never sends old messages",async()=>{
 const allMessages=[{fromMe:false,type:"TEXT",content:"old customer message",remoteJid:"15551234567@s.whatsapp.net",keyId:"old"}];
 let sends=0,queries=0,status="CONNECTED",created=false,session="nexus-local-test",responses=[],presence=[];
 const json=(body,code=200)=>({ok:code<400,status:code,json:async()=>body});
 const mock=async(url,init={})=>{
  const parsed=new URL(url);
  const p=parsed.pathname;
  // Ollama and WA-AKG both have an /api/chat path. Route mocks by origin first.
  if(parsed.port==="11434"&&p==="/api/chat"){
    const request=JSON.parse(init.body);
    assert.match(request.messages[0].content,/Nexus Test Bakery/);
    assert.match(request.messages[0].content,/Sourdough/);
    assert.match(request.messages[0].content,/Mia/);
    assert.equal(request.think,false,"Qwen3 should not spend its reply token budget on thinking");
    assert.ok(request.options.num_predict>=700);
    queries++;
    if(queries===1)return json({message:{content:"",thinking:"internal reasoning must never reach the WhatsApp user"},done_reason:"length"});
    return json({message:{content:"Hello from Nexus!"},done_reason:"stop"});
  }
  if(p==="/api/sessions"&&init.method==="POST"){created=true;return json({status:true,data:{sessionId:session}})}
  if(p==="/api/sessions/"+session) return json({status:true,data:{status}});
  if(p==="/api/sessions/"+session+"/start") return json({status:true});
  if(p==="/api/sessions/"+session+"/qr")return json({status:true,data:{base64:"data:image/png;base64,aGVsbG8=",success:true}});
  if(p==="/api/chat/"+session)return json({status:true,data:[{jid:"15551234567@s.whatsapp.net"},{jid:"15557654321@s.whatsapp.net"},{jid:"120363@g.us"}]});
  if(p==="/api/chat/"+session+"/15551234567%40s.whatsapp.net")return json({status:true,data:allMessages});
  if(p==="/api/chat/"+session+"/15557654321%40s.whatsapp.net")return json({status:true,data:[{fromMe:false,type:"TEXT",keyId:"other",content:"please ignore",remoteJid:"15557654321@s.whatsapp.net"}]});
  if(p.endsWith("/presence")&&init.method==="POST"){presence.push(JSON.parse(init.body).presence);return json({success:true})}
  if(p.startsWith("/api/messages/")){sends++;responses.push(JSON.parse(init.body));return json({status:true})}
  throw Error("Unexpected request "+url);
 };
 const bridge=await startBridge({settings:{apiRoot:"http://127.0.0.1:3000",ollamaRoot:"http://127.0.0.1:11434",apiKey:"local-testing-only",model:"qwen3:4b",business:"Demo",session:"",allow:new Set(["15551234567"])},fetcher:mock,port:0});
 const port=bridge.server.address().port,base="http://127.0.0.1:"+port;
 const call=async(action)=>{const r=await fetch(base+"/api/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});return r.json()};
 try{
  let state=await (await fetch(base+"/api/status")).json();
  assert.equal(state.armed,false);
  assert.equal(state.session,"");
  const earlyQr=await fetch(base+"/api/qr");
  assert.equal(earlyQr.status,409);
  assert.match((await earlyQr.json()).error,/Link Your WhatsApp first/);
  await call("connect");assert.equal(created,true);
  assert.equal(bridge.state.session,session);
  assert.equal(bridge.state.armed,false);
  await call("start");
  assert.equal((await (await fetch(base+"/api/qr")).json()).base64.startsWith("data:image/png"),true);
  const beforeSettings=await call("arm");
  assert.match(beforeSettings.error,/business settings first/i);
  assert.equal(bridge.state.armed,false);
  const internalKey=crypto.createHash("sha256").update("nexus-wa-local-settings-v1:local-testing-only").digest("hex");
  const businessData={store:{id:"11111111-1111-4111-8111-111111111111",name:"Nexus Test Bakery",agent_name:"Mia",description:"Sells fresh breads.",hours:"9 AM to 5 PM",ai_personality:"friendly"},items:[{name:"Sourdough",type:"Product",description:"Fresh loaf",price_label:"$8",status:"Available"}],profile:null};
  const denied=await fetch(base+"/api/business",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(businessData)});
  assert.equal(denied.status,403);
  const update=await fetch(base+"/api/business",{method:"POST",headers:{"Content-Type":"application/json","X-Nexus-Internal-Key":internalKey},body:JSON.stringify(businessData)});
  assert.equal(update.status,200);
  assert.equal((await update.json()).business,"Nexus Test Bakery");
  await call("arm");assert.equal(bridge.state.armed,true);assert.equal(bridge.state.seen.has("old"),true);
  assert.equal(sends,0);
  allMessages.push({fromMe:false,type:"TEXT",content:"hello!",remoteJid:"15551234567@s.whatsapp.net",keyId:"new-one"});
  // Poll every 5 seconds; allow a little scheduling slack on busy Windows machines.
  const deadline=Date.now()+8500;
  while(sends<1&&Date.now()<deadline)await new Promise(r=>setTimeout(r,150));
  assert.equal(sends,1,JSON.stringify({queries,errors:bridge.state.errors,recent:bridge.state.recent}));
  assert.deepEqual(responses[0],{message:{text:withNexusWhatsAppIdentity("Hello from Nexus!","hello!")}});
  assert.equal((responses[0].message.text.match(/https:\/\/zapzap-bot\.netlify\.app\//g)||[]).length,1);
  assert.equal(queries,2,"empty Qwen3 responses should be retried");
  assert.deepEqual(presence,["composing","paused"]);
  status="DISCONNECTED";
  const final=await (await fetch(base+"/api/status")).json();
  assert.equal(final.armed,false);
 }finally{await bridge.close()}
});

test("WhatsApp customer replies reject raw Qwen reasoning, never cut a thinking block mid-answer",()=>{
 const bad=[
  "Okay, the user sent \"Oi\" which means hello. I should reply in Portuguese.",
  "We are given a greeting in Portuguese: Oi. Steps: 1. Acknowledge it.",
  "The customer wrote Oi. Looking at the business facts, I should respond.",
  "The instructions say: Speak in the customer's language.",
  "1. Acknowledge the greeting\n2. Respond in Portuguese",
  "<think>Let me reason internally</think>Okay, the user is saying hi",
  "Okay, the user wrote Oi; here's my plan.",
  "<think>unfinished reasoning",
  "",
 ];
 for(const value of bad)assert.equal(safeCustomerReply(value),null,"MUST block: "+value);
 assert.equal(safeCustomerReply("Olá! Sou assistente da Nexus AI. Como posso ajudar?"),"Olá! Sou assistente da Nexus AI. Como posso ajudar?");
 assert.equal(safeCustomerReply("<think>Hidden thought</think>Olá! Como posso ajudar?"),"Olá! Como posso ajudar?");
});

test("safe fallback answers a real Portuguese Nexus offerings question using only catalog facts",()=>{
 const store={name:"Nexus AI"};
 const offerings=[
  {name:"SmartStore",price_label:"R$ 49",status:"Available"},
  {name:"Assistentes de IA",price_label:"",status:"Available"},
  {name:"Automação de Atendimento",price_label:"",status:"Available"},
 ];
 const offer=localSafeFallback("Olá, quero saber quais serviços a Nexus AI oferece.",store,offerings);
 assert.match(offer,/A Nexus AI oferece:/);
 assert.match(offer,/SmartStore/);
 assert.match(offer,/Assistentes de IA/);
 assert.doesNotMatch(offer,/Como posso ajudar\?/);
 const price=localSafeFallback("Quanto custa?",store,offerings);
 assert.match(price,/SmartStore \(R\$ 49\)/);
 assert.match(price,/valores não informados precisam ser confirmados/);
 assert.doesNotMatch(price,/Assistentes de IA \(R\$ 49\)/);
 assert.match(localSafeFallback("Oi",store,offerings),/^Olá!/);
 assert.match(localSafeFallback("Hello",store,offerings),/^Hi!/);
 assert.match(localSafeFallback("Hola",store,offerings),/^¡Hola!/);
 assert.doesNotMatch(localSafeFallback("What services do you offer?",store,offerings),/R\$ 49/);
});

test("every WhatsApp auto-reply includes one Nexus AI identity and canonical website in the customer's language",()=>{
 const website="https://zapzap-bot.netlify.app/";
 const examples=[
  {input:"Oi, quais serviços vocês oferecem?",output:"Aqui estão nossos serviços.",label:"Quem somos:"},
  {input:"Olá, quanto custa?",output:"Os preços estão no catálogo.",label:"Quem somos:"},
  {input:"Hola, qué servicios ofrecen?",output:"Tenemos distintas soluciones.",label:"Quiénes somos:"},
  {input:"Hello, what do you offer?",output:"We provide business solutions.",label:"Who we are:"},
 ];
 for(const item of examples){
  const final=withNexusWhatsAppIdentity(item.output,item.input);
  assert.ok(final.startsWith(item.output+"\n\n"),"Preserve the actual customer answer");
  assert.ok(final.includes(item.label),"Include who we are in the customer's language");
  assert.equal(final.split(website).length-1,1,"Append website exactly once");
 }
 const twice=withNexusWhatsAppIdentity("Learn more: https://zapzap-bot.netlify.app/","Hello");
 assert.equal(twice.split(website).length-1,1,"Never send duplicate links");
 const empty=withNexusWhatsAppIdentity("","Oi");
 assert.match(empty,/Quem somos:.*Nexus AI/);
 assert.equal(empty.split(website).length-1,1);
});


test("WhatsApp anti-loop ignores echoed bot messages even with incorrect incoming flag",()=>{
 const examples=[
 "Olá! Sou o assistente virtual da Nexus AI. Como posso ajudar você hoje?\n\nWho we are: Nexus AI provides AI-powered customer service and sales solutions.\n\nLearn more about Nexus AI: https://zapzap-bot.netlify.app/",
 "Quem somos: A Nexus AI oferece soluções de atendimento e vendas com inteligência artificial.",
 "Conoce Nexus AI: https://zapzap-bot.netlify.app/",
 "Hi! I'm the virtual assistant for Nexus AI. How can I help you today?"
 ];
 for(const text of examples)assert.equal(looksLikeNexusAutoReply(text),true);
 assert.equal(looksLikeNexusAutoReply("Oi, quanto custa o serviço?"),false);
 assert.equal(looksLikeNexusAutoReply("Mano kkkk"),false);
 const safety=makeReplySafety();
 assert.equal(safety.allow("15550000001@s.whatsapp.net",examples[0],1000).ok,false);
});

test("WhatsApp rate limiting prevents bursts and automatically shuts down at global cap",()=>{
 const safety=makeReplySafety({perContactMs:180000,windowMs:600000,maxInWindow:3});
 const first="15550000001@s.whatsapp.net";
 assert.equal(safety.allow(first,"Oi",100000).ok,true);
 safety.record(first,100000);
 const cooldown=safety.allow(first,"Oi de novo",100001);
 assert.equal(cooldown.ok,false);assert.match(cooldown.reason,/cooldown/);
 assert.equal(safety.allow(first,"Oi",280001).ok,true);
 for(let i=2;i<=3;i++){
  const jid="1555000000"+i+"@s.whatsapp.net";
  assert.equal(safety.allow(jid,"Quero um orçamento",100000+i).ok,true);
  safety.record(jid,100000+i);
 }
 const stop=safety.allow("15550000004@s.whatsapp.net","Oi",100010);
 assert.equal(stop.ok,false);assert.equal(stop.stop,true);
 const recovered=safety.allow("15550000004@s.whatsapp.net","Oi",700100);
 assert.equal(recovered.ok,true);
});

test("WhatsApp fail-closed restart, business refresh and send-time pause protection",async()=>{
 const bridge=await import("../scripts/wa-akg-local-bridge.mjs");
 const source=await (await import("node:fs/promises")).readFile(new URL("../scripts/wa-akg-local-bridge.mjs",import.meta.url),"utf8");
 assert.match(source,/autoReply:values\.NEXUS_WA_AUTO_REPLY==="on"/);
 assert.match(source,/state\.requested=false; \/\/ Updating business settings must never re-arm/);
 assert.match(source,/Saved business settings restored\. Automatic replies paused until explicitly enabled/);
 assert.match(source,/if\(!state\.requested\|\|!state\.armed\)return;/);
 assert.match(source,/replySafety\.record\(n\.jid\)/);
 assert.match(source,/state\.requested=false;state\.armed=false;log\("SAFETY STOP:/);
 assert.ok(bridge.makeReplySafety);
});
