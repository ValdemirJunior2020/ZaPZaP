import test from "node:test";
import assert from "node:assert/strict";
import {handler as inquiry} from "../netlify/functions/store-inquiry.mjs";
import {handler as publicStore} from "../netlify/functions/public-store.mjs";
import {handler as widgetConfig} from "../netlify/functions/widget-config.mjs";
import {handler as checkout} from "../netlify/functions/billing-checkout.mjs";
import {handler as webhook} from "../netlify/functions/billing-webhook.mjs";
const uid="22222222-2222-4222-8222-222222222222";
const sid="11111111-1111-4111-8111-111111111111";
const bid="bot_1234567890abcdef12345678";
const validStore={id:sid,owner_id:uid,slug:"plumbing-demo",name:"Plumbing Demo",published:true,agent_name:"Alex"};
const ent={user_id:uid,is_complimentary:true,subscription_status:"TRIAL",trial_started_at:null};
const response=(payload,status=200)=>({ok:status>=200&&status<300,status,json:async()=>payload,text:async()=>JSON.stringify(payload)});
const event=(body)=>({httpMethod:"POST",headers:{host:"example.com",origin:"https://example.com",authorization:"Bearer test.session", "x-forwarded-for":"192.0.2.30"},body:JSON.stringify(body)});
function setup(){
 Object.assign(process.env,{NEXUS_SUPABASE_URL:"https://test.supabase.co",NEXUS_SUPABASE_SECRET_KEY:"sb_secret_test",
 NEXUS_ABUSE_SECRET:"123456789012345678901234567890123456",NEXUS_OLLAMA_URL:"https://ai.example.com/",
 NEXUS_OLLAMA_GATEWAY_TOKEN:"secure-token",NEXUS_LIVE_CHAT_ENABLED:"true",NEXUS_OLLAMA_MODEL:"qwen3:8b"});
}
test("Public SmartStore and enabled widget resolve only published eligible tenant",async()=>{
 setup();const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  const u=String(url);
  if(u.includes("/nx_stores"))return response([validStore]);
  if(u.includes("/nx_entitlements"))return response([ent]);
  if(u.includes("/nx_offerings"))return response([{id:"33333333-3333-4333-8333-333333333333",name:"Drain repair",price_label:"$99",status:"Available"}]);
  if(u.includes("/nx_bots"))return response([{bot_id:bid,store_id:sid,greeting:"Hello"}]);
  throw Error("Unexpected read "+u);
 };
 try{
  const storeResponse=await publicStore({httpMethod:"GET",queryStringParameters:{slug:"plumbing-demo"},headers:{}});
  assert.equal(storeResponse.statusCode,200);
  assert.equal(JSON.parse(storeResponse.body).store.name,"Plumbing Demo");
  const widgetResponse=await widgetConfig({httpMethod:"GET",queryStringParameters:{botId:bid},headers:{}});
  assert.equal(widgetResponse.statusCode,200);
  assert.equal(JSON.parse(widgetResponse.body).available,true);
  assert.equal(JSON.parse(widgetResponse.body).chatReady,true);
 }finally{globalThis.fetch=original}
});
test("Public lead is accepted only for a published store and can be persisted for owner dashboard",async()=>{
 setup();const original=globalThis.fetch;let stored=null;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes("rpc/nx_consume_abuse_budget"))return response(true);
  if(u.includes("/nx_stores"))return response([validStore]);
  if(u.includes("/nx_entitlements"))return response([ent]);
  if(u.includes("/nx_offerings"))return response([]);
  if(u.includes("/nx_leads")&&options.method==="POST"){
   stored=JSON.parse(options.body);
   return response([{id:"44444444-4444-4444-8444-444444444444",...stored}],201);
  }
  if(u.includes("/nx_leads"))return response(stored?[{id:"44444444-4444-4444-8444-444444444444",...stored}]:[]);
  throw Error("Unexpected request "+u);
 };
 try{
  const r=await inquiry(event({slug:"plumbing-demo",name:"Test Visitor",email:"test@example.invalid",phone:"",interest:"Please call about my service"}));
  assert.equal(r.statusCode,201);
  assert.equal(JSON.parse(r.body).accepted,true);
  assert.equal(stored.store_id,sid);
  assert.equal(stored.customer_email,"test@example.invalid");
  assert.equal(stored.status,"New");
  const ownerRead=await globalThis.fetch("https://test.supabase.co/rest/v1/nx_leads?store_id=eq."+sid);
  assert.equal((await ownerRead.json())[0].interest,"Please call about my service");
  const invalid=await inquiry(event({slug:"plumbing-demo",name:"X",email:"not-an-email",interest:"bad"}));
  assert.equal(invalid.statusCode,400);
 }finally{globalThis.fetch=original}
});
test("PayPal checkout stays disabled without secrets, even for valid plan selection",async()=>{
 setup();const old=process.env.NEXUS_BILLING_ENABLED;delete process.env.NEXUS_BILLING_ENABLED;
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw Error("Billing network must not be used")};
 try{const r=await checkout(event({tier:"core"}));assert.equal(r.statusCode,503);assert.match(JSON.parse(r.body).error,/being configured|not enabled/i)}
 finally{globalThis.fetch=original;if(old===undefined)delete process.env.NEXUS_BILLING_ENABLED;else process.env.NEXUS_BILLING_ENABLED=old}
});
test("Legacy and proposed PayPal checkouts remain disabled even if env flag is true",async()=>{
 setup();
 const original=globalThis.fetch,old=process.env.NEXUS_BILLING_ENABLED;
 process.env.NEXUS_BILLING_ENABLED="true";
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error("No PayPal calls allowed")};
 try{
  for(const tier of ["core","core_widget","business"]){
   const result=await checkout(event({tier}));
   assert.equal(result.statusCode,503);
   assert.match(JSON.parse(result.body).error,/499/);
  }
  assert.equal(calls,0);
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.NEXUS_BILLING_ENABLED;else process.env.NEXUS_BILLING_ENABLED=old}
});
test("PayPal webhook verifies signature via Sandbox before changing subscription",async()=>{
 setup();const original=globalThis.fetch;const keys=["PAYPAL_MODE","PAYPAL_CLIENT_ID","PAYPAL_CLIENT_SECRET","PAYPAL_PLAN_ID","PAYPAL_WEBHOOK_ID"];const prev=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 Object.assign(process.env,{PAYPAL_MODE:"sandbox",PAYPAL_CLIENT_ID:"id",PAYPAL_CLIENT_SECRET:"secret",PAYPAL_PLAN_ID:"P-CORE-TEST",PAYPAL_WEBHOOK_ID:"WEBHOOK-TEST"});
 let changed=false;
 globalThis.fetch=async(url,opt={})=>{
  const u=String(url);
  if(u.endsWith("/v1/oauth2/token"))return response({access_token:"sandbox-access"});
  if(u.endsWith("/v1/notifications/verify-webhook-signature"))return response({verification_status:"SUCCESS"});
  if(u.includes("/v1/billing/subscriptions/I-TEST123456"))return response({id:"I-TEST123456",custom_id:uid,plan_id:"P-CORE-TEST",status:"ACTIVE"});
  if(u.includes("/nx_entitlements")&&opt.method==="PATCH"){changed=JSON.parse(opt.body).subscription_status==="ACTIVE";return response([])}
  if(u.includes("/nx_entitlements"))return response([{is_complimentary:false,paypal_subscription_id:"I-TEST123456"}]);
  throw Error("Unexpected webhook request "+u);
 };
 try{
  const e=event({event_type:"BILLING.SUBSCRIPTION.ACTIVATED",resource:{id:"I-TEST123456"}});
  Object.assign(e.headers,{"paypal-transmission-id":"test","paypal-transmission-time":"today","paypal-transmission-sig":"test","paypal-cert-url":"https://api-m.sandbox.paypal.com/test","paypal-auth-algo":"SHA256withRSA"});
  const r=await webhook(e);
  assert.equal(r.statusCode,200);assert.equal(changed,true);
  const spoof=event({event_type:"BILLING.SUBSCRIPTION.ACTIVATED",resource:{id:"I-TEST123456"}});
  assert.equal((await webhook(spoof)).statusCode,401);
 }finally{globalThis.fetch=original;for(const[k,v]of Object.entries(prev)){if(v===undefined)delete process.env[k];else process.env[k]=v}}
});


test("Website widget includes a lead form that persists through the protected inquiry endpoint",async()=>{
 const{readFile}=await import("node:fs/promises");
 const{fileURLToPath}=await import("node:url");
 const{dirname,resolve}=await import("node:path");
 const root=resolve(dirname(fileURLToPath(import.meta.url)),"..");
 const html=await readFile(resolve(root,"widget-chat.html"),"utf8");
 assert.match(html,/id="leadForm"/);
 assert.match(html,/id="leadName"/);
 assert.match(html,/id="leadEmail"/);
 assert.match(html,/id="leadInterest"/);
 assert.match(html,/\/api\/store-inquiry/);
 assert.match(html,/chatReady===true/,"Chat may be offline while inquiries stay available");
});
test("Disabled live AI does not disable the published widget contact form",async()=>{
 setup();const old=process.env.NEXUS_LIVE_CHAT_ENABLED;process.env.NEXUS_LIVE_CHAT_ENABLED="false";
 const original=globalThis.fetch;
 globalThis.fetch=async(url)=>{
  const u=String(url);
  if(u.includes("/nx_bots"))return response([{bot_id:bid,store_id:sid,greeting:"Welcome"}]);
  if(u.includes("/nx_stores"))return response([validStore]);
  if(u.includes("/nx_entitlements"))return response([ent]);
  throw Error("Unexpected read "+u);
 };
 try{
  const r=await widgetConfig({httpMethod:"GET",queryStringParameters:{botId:bid},headers:{}});
  assert.equal(r.statusCode,200);
  assert.equal(JSON.parse(r.body).available,true);
  assert.equal(JSON.parse(r.body).chatReady,false);
 }finally{globalThis.fetch=original;if(old===undefined)delete process.env.NEXUS_LIVE_CHAT_ENABLED;else process.env.NEXUS_LIVE_CHAT_ENABLED=old}
});
