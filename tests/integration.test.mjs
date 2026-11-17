import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import{handler as whatsapp}from"../netlify/functions/whatsapp.mjs";
import{handler as admin}from"../netlify/functions/admin-auth.mjs";
import{handler as chat}from"../netlify/functions/store-chat.mjs";
import{access}from"../netlify/lib/billing.mjs";
const uuid="11111111-1111-4111-8111-111111111111";
const owner="22222222-2222-4222-8222-222222222222";
const configure=()=>{
 Object.assign(process.env,{
  NEXUS_SUPABASE_URL:"https://test.supabase.co",NEXUS_SUPABASE_SECRET_KEY:"sb_secret_test",
  NEXUS_ABUSE_SECRET:"123456789012345678901234567890123456",
  NEXUS_OLLAMA_URL:"https://qwen.example.com/",NEXUS_OLLAMA_GATEWAY_TOKEN:"gateway-secret",
  NEXUS_LIVE_CHAT_ENABLED:"true",WHATSAPP_APP_SECRET:"test-hmac-secret",
  WHATSAPP_ACCESS_TOKEN:"meta-test",WHATSAPP_PHONE_NUMBER_ID:"12345678901"
 });
};
const response=(j,status=200)=>({ok:status>=200&&status<300,status,json:async()=>j,text:async()=>JSON.stringify(j)});
const tenant={id:uuid,owner_id:owner,name:"Alpha Plumbing",slug:"alpha-plumbing",published:true,agent_name:"Alex",description:"Licensed plumbing repairs",hours:"Weekdays 9-5"};
const product={name:"Drain cleaning",type:"Service",description:"Drain clearing",price_label:"$75",status:"Available"};
function fakeFetch({claim=true,active=true,role="super_admin",sendSpy=()=>{},capture=()=>{}}={}){
 return async(input,options={})=>{
  const url=String(input),method=options.method||"GET";
  if(url.includes("/auth/v1/user"))return response({id:owner,app_metadata:{role}});
  if(url.includes("rpc/nx_consume_abuse_budget"))return response(true);
  if(url.includes("rpc/nx_claim_whatsapp_message"))return response(claim);
  if(url.includes("rpc/nx_consume_chat_quota"))return response(true);
  if(url.includes("/rest/v1/nx_whatsapp_channels"))return response([{store_id:uuid}]);
  if(url.includes("/rest/v1/nx_stores"))return response([{...tenant}]);
  if(url.includes("/rest/v1/nx_entitlements"))return response([{user_id:owner,trial_started_at:new Date().toISOString(),subscription_status:active?"TRIAL":"EXPIRED"}]);
  if(url.includes("/rest/v1/nx_offerings"))return response([product]);
  if(url.includes("/rest/v1/nx_whatsapp_messages"))return response(null);
  if(url==="https://qwen.example.com/api/chat"){
   const b=JSON.parse(options.body);capture(b);
   return response({message:{content:"Drain cleaning is listed at $75."}});
  }
  if(url.includes("graph.facebook.com")){sendSpy(JSON.parse(options.body));return response({messages:[{id:"out1"}]})}
  throw Error("Unexpected network request: "+url+" "+method);
 };
}
const signedEvent=()=>{
 const body=JSON.stringify({object:"whatsapp_business_account",entry:[{changes:[{value:{metadata:{phone_number_id:"12345678901"},messages:[{id:"wamid.123456",type:"text",from:"15551234567",text:{body:"How much for drain cleaning?"}}]}}]}]});
 const sig="sha256="+crypto.createHmac("sha256",process.env.WHATSAPP_APP_SECRET).update(body).digest("hex");
 return{httpMethod:"POST",body,headers:{"x-hub-signature-256":sig}};
};
const authEvent=(aal)=>{const token="e30."+Buffer.from(JSON.stringify({sub:owner,aal})).toString("base64url")+".sig";return{httpMethod:"GET",headers:{authorization:"Bearer "+token,"x-nf-client-connection-ip":"192.0.2.1"}}};
test("48-hour trial has no client-controlled start and expires",()=>{
 const noStart=access({trial_started_at:null,subscription_status:"TRIAL"});
 assert.equal(noStart.reason,"NOT_STARTED");assert.equal(noStart.allowed,false);
 const expired=access({trial_started_at:new Date(Date.now()-49*3600000).toISOString(),subscription_status:"TRIAL"});
 assert.equal(expired.reason,"TRIAL_EXPIRED");assert.equal(expired.allowed,false);
 const active=access({trial_started_at:new Date(Date.now()-49*3600000).toISOString(),subscription_status:"ACTIVE"});
 assert.equal(active.allowed,true);
});
test("WhatsApp rejects invalid Meta signature before any business lookup",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error("Should not query database")};
 try{const e=signedEvent();e.headers["x-hub-signature-256"]="sha256=bad";const r=await whatsapp(e);assert.equal(r.statusCode,403)}
 finally{globalThis.fetch=original}
});
test("WhatsApp is mapped by receiving phone ID, uses tenant catalog and Ollama only",async()=>{
 configure();const original=globalThis.fetch;let prompt,delivered;
 globalThis.fetch=fakeFetch({capture:b=>prompt=b,sendSpy:b=>delivered=b});
 try{
  const r=await whatsapp(signedEvent());
  assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).delivered,1);
  assert.match(JSON.stringify(prompt.messages),/Alpha Plumbing/);
  assert.match(JSON.stringify(prompt.messages),/Drain cleaning/);
  assert.doesNotMatch(JSON.stringify(prompt),/api.openai.com|OpenAI/i);
  assert.equal(delivered.to,"15551234567");
  assert.match(delivered.text.body,/\$75/);
 }finally{globalThis.fetch=original}
});
test("Repeated WhatsApp message ID cannot produce another outbound message",async()=>{
 configure();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=fakeFetch({claim:false,sendSpy:()=>calls++});
 try{const r=await whatsapp(signedEvent());assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).delivered,0);assert.equal(calls,0)}
 finally{globalThis.fetch=original}
});
test("WhatsApp fails closed when its tenant trial has expired",async()=>{
 configure();const original=globalThis.fetch;let calls=0;
 globalThis.fetch=fakeFetch({active:false,sendSpy:()=>calls++});
 try{const r=await whatsapp(signedEvent());assert.equal(JSON.parse(r.body).delivered,0);assert.equal(calls,0)}
 finally{globalThis.fetch=original}
});
test("Admin requires server-verified role plus aal2; PIN provides no access",async()=>{
 configure();const original=globalThis.fetch;
 globalThis.fetch=fakeFetch({role:"super_admin"});
 try{
  assert.equal((await admin(authEvent("aal1"))).statusCode,403);
  assert.equal((await admin(authEvent("aal2"))).statusCode,200);
  globalThis.fetch=fakeFetch({role:"business_owner"});
  assert.equal((await admin(authEvent("aal2"))).statusCode,403);
  assert.equal((await admin({httpMethod:"POST",headers:{},body:JSON.stringify({action:"login",pin:"1893"})})).statusCode,405);
 }finally{globalThis.fetch=original}
});
test("Public chat rejects unconfigured Ollama and forged origin",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=fakeFetch();
 try{
  const bad={httpMethod:"POST",headers:{origin:"https://attacker.example",host:"zapzap-bot.netlify.app"},body:JSON.stringify({slug:tenant.slug,message:"price?"})};
  assert.equal((await chat(bad)).statusCode,403);
  process.env.NEXUS_LIVE_CHAT_ENABLED="false";
  assert.equal((await chat({...bad,headers:{origin:"https://zapzap-bot.netlify.app",host:"zapzap-bot.netlify.app"}})).statusCode,503);
 }finally{globalThis.fetch=original}
});
