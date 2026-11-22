import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {validSession,validJid,normalizeMessage,approvedSender,buildPrompt,startBridge} from "../scripts/wa-akg-local-bridge.mjs";

test("validates sessions, WhatsApp personal JIDs and safe messages",()=>{
 assert.equal(validSession("nexus-local-x"),true);
 assert.equal(validSession("../admin"),false);
 assert.equal(validJid("15551234567@s.whatsapp.net"),true);
 assert.equal(validJid("100000@g.us"),false);
 assert.equal(normalizeMessage({fromMe:false,type:"TEXT",content:" hi ",remoteJid:"15551234567@s.whatsapp.net",keyId:"x"}).text,"hi");
 assert.equal(normalizeMessage({fromMe:true,type:"TEXT",content:"x",remoteJid:"15551234567@s.whatsapp.net",keyId:"y"}),null);
 assert.equal(approvedSender("15551234567@s.whatsapp.net",new Set(["15551234567"])),true);
 assert.equal(approvedSender("15551234567@s.whatsapp.net",new Set(["15557654321"])),false);
 assert.match(buildPrompt("Test Garage","When are you open?")[0].content,/Never invent opening hours/);
});

test("local gateway uses mock WA-AKG: starts OFF, limits testing to allowlist, and never sends old messages",async()=>{
 const allMessages=[{fromMe:false,type:"TEXT",content:"old customer message",remoteJid:"15551234567@s.whatsapp.net",keyId:"old"}];
 let sends=0,queries=0,status="CONNECTED",created=false,session="nexus-local-test",responses=[];
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
    queries++;
    return json({message:{content:"Hello from Nexus!"}});
  }
  if(p==="/api/sessions"&&init.method==="POST"){created=true;return json({status:true,data:{sessionId:session}})}
  if(p==="/api/sessions/"+session) return json({status:true,data:{status}});
  if(p==="/api/sessions/"+session+"/start") return json({status:true});
  if(p==="/api/sessions/"+session+"/qr")return json({status:true,data:{base64:"data:image/png;base64,aGVsbG8=",success:true}});
  if(p==="/api/chat/"+session)return json({status:true,data:[{jid:"15551234567@s.whatsapp.net"},{jid:"15557654321@s.whatsapp.net"},{jid:"120363@g.us"}]});
  if(p==="/api/chat/"+session+"/15551234567%40s.whatsapp.net")return json({status:true,data:allMessages});
  if(p==="/api/chat/"+session+"/15557654321%40s.whatsapp.net")return json({status:true,data:[{fromMe:false,type:"TEXT",keyId:"other",content:"please ignore",remoteJid:"15557654321@s.whatsapp.net"}]});
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
  assert.deepEqual(responses[0],{message:{text:"Hello from Nexus!"}});
  assert.equal(queries,1);
  status="DISCONNECTED";
  const final=await (await fetch(base+"/api/status")).json();
  assert.equal(final.armed,false);
 }finally{await bridge.close()}
});
