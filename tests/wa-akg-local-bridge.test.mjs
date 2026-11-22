import test from "node:test";
import assert from "node:assert/strict";
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
  const p=new URL(url).pathname;
  if(p==="/api/sessions"&&init.method==="POST"){created=true;return json({status:true,data:{sessionId:session}})}
  if(p==="/api/sessions/"+session) return json({status:true,data:{status}});
  if(p==="/api/sessions/"+session+"/start") return json({status:true});
  if(p==="/api/sessions/"+session+"/qr")return json({base64:"data:image/png;base64,aGVsbG8=",success:true});
  if(p==="/api/chat/"+session)return json({status:true,data:[{jid:"15551234567@s.whatsapp.net"},{jid:"15557654321@s.whatsapp.net"},{jid:"120363@g.us"}]});
  if(p==="/api/chat/"+session+"/15551234567%40s.whatsapp.net")return json({status:true,data:allMessages});
  if(p==="/api/chat/"+session+"/15557654321%40s.whatsapp.net")return json({status:true,data:[{fromMe:false,type:"TEXT",keyId:"other",content:"please ignore",remoteJid:"15557654321@s.whatsapp.net"}]});
  if(p==="/api/chat")return json({status:true,data:[]});
  if(p.startsWith("/api/messages/")){sends++;responses.push(JSON.parse(init.body));return json({status:true})}
  if(p==="/api/chat"){queries++;return json({status:true,data:[]})}
  if(p==="/api/chat"||p.endsWith("/api/chat"))return json({message:{content:"Hello from Nexus!"}});
  if(url.includes(":11434/api/chat")){queries++;return json({message:{content:"Hello from Nexus!"}})}
  throw Error("Unexpected request "+url);
 };
 const bridge=await startBridge({settings:{apiRoot:"http://127.0.0.1:3000",ollamaRoot:"http://127.0.0.1:11434",apiKey:"local-testing-only",model:"qwen3:4b",business:"Demo",session:"",allow:new Set(["15551234567"])},fetcher:mock,port:0});
 const port=bridge.server.address().port,base="http://127.0.0.1:"+port;
 const call=async(action)=>{const r=await fetch(base+"/api/"+action,{method:"POST",headers:{"Content-Type":"application/json"},body:"{}"});return r.json()};
 try{
  let state=await (await fetch(base+"/api/status")).json();
  assert.equal(state.armed,false);
  assert.equal(state.session,"");
  await call("create");assert.equal(created,true);
  await call("start");
  assert.equal((await (await fetch(base+"/api/qr")).json()).base64.startsWith("data:image/png"),true);
  await call("arm");assert.equal(bridge.state.armed,true);assert.equal(bridge.state.seen.has("old"),true);
  assert.equal(sends,0);
  allMessages.push({fromMe:false,type:"TEXT",content:"hello!",remoteJid:"15551234567@s.whatsapp.net",keyId:"new-one"});
  // Timer polls every 5 seconds: verify first reply is new message only.
  await new Promise(r=>setTimeout(r,5150));
  assert.equal(sends,1);
  assert.deepEqual(responses[0],{message:{text:"Hello from Nexus!"}});
  status="DISCONNECTED";
  const final=await (await fetch(base+"/api/status")).json();
  assert.equal(final.armed,false);
 }finally{await bridge.close()}
});
