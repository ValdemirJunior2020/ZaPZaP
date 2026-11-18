import test from"node:test";
import assert from"node:assert/strict";
import crypto from"node:crypto";
import{handler as whatsapp}from"../netlify/functions/whatsapp.mjs";
import{executeOnce}from"../netlify/lib/whatsapp-delivery.mjs";
import{handler as admin}from"../netlify/functions/admin-auth.mjs";
import{handler as chat}from"../netlify/functions/store-chat.mjs";
import{handler as ownerApi}from"../netlify/functions/owner-workspace.mjs";
import{handler as checkout}from"../netlify/functions/billing-checkout.mjs";
import{access}from"../netlify/lib/billing.mjs";
const uid="22222222-2222-4222-8222-222222222222";
const sid="11111111-1111-4111-8111-111111111111";
const store={id:sid,owner_id:uid,name:"Alpha Plumbing",slug:"alpha-plumbing",published:true,agent_name:"Alex",description:"Plumbing repairs",hours:"Weekdays 9–5"};
const item={name:"Drain cleaning",type:"Service",price_label:"$75",description:"Clear residential drains",status:"Available"};
const job={message_id:"wamid.123456",store_id:sid,phone_number_id:"12345678901",sender_phone:"15551234567",incoming_text:"How much is drain cleaning?",lease_id:"33333333-3333-4333-8333-333333333333",attempts:1};
const res=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
function configure(){
 Object.assign(process.env,{NEXUS_SUPABASE_URL:"https://test.supabase.co",NEXUS_SUPABASE_SECRET_KEY:"sb_secret_test",NEXUS_ABUSE_SECRET:"123456789012345678901234567890123456",
  NEXUS_OLLAMA_URL:"https://qwen.example.com/",NEXUS_OLLAMA_GATEWAY_TOKEN:"gateway-secret",NEXUS_LIVE_CHAT_ENABLED:"true",
  WHATSAPP_APP_SECRET:"test-meta-secret",WHATSAPP_ACCESS_TOKEN:"fake-meta",WHATSAPP_PHONE_NUMBER_ID:"12345678901"});
}
function webhook(){
 const body=JSON.stringify({object:"whatsapp_business_account",entry:[{changes:[{value:{metadata:{phone_number_id:"12345678901"},messages:[{id:"wamid.123456",type:"text",from:"15551234567",text:{body:"How much is drain cleaning?"}}]}}]}]});
 return{httpMethod:"POST",body,headers:{"x-hub-signature-256":"sha256="+crypto.createHmac("sha256",process.env.WHATSAPP_APP_SECRET).update(body).digest("hex")}};
}
function fakeNetwork({claim=[job],enqueue=true,active=true,role="super_admin",ollamaOk=true,onCall=()=>{},failEnqueue=false}={}){
 return async(url,options={})=>{
  const u=String(url),payload=options.body?JSON.parse(options.body):{};
  onCall(u,payload);
  if(u.includes("/auth/v1/user"))return res({id:uid,app_metadata:{role}});
  if(u.includes("/rest/v1/nx_whatsapp_channels"))return res([{store_id:sid}]);
  if(u.includes("/rest/v1/nx_stores"))return res([{...store}]);
  if(u.includes("/rest/v1/nx_offerings"))return res([item]);
  if(u.includes("/rest/v1/nx_entitlements"))return res([{user_id:uid,trial_started_at:active?new Date().toISOString():new Date(Date.now()-49*3600000).toISOString(),subscription_status:"TRIAL"}]);
  if(u.includes("rpc/nx_claim_chat_message"))return res({allowed:true,sessionId:"44444444-4444-4444-8444-444444444444",used:1,max:10,remaining:9});
  if(u.includes("nx_chat_messages"))return options.method==="POST"?res(null,201):res([]);
  if(u.includes("rpc/nx_enqueue_whatsapp"))return failEnqueue?res({error:"db"},503):res(enqueue);
  if(u.includes("rpc/nx_claim_next_whatsapp"))return res(claim);
  if(u.includes("rpc/nx_finish_whatsapp"))return res(true);
  if(u.includes("rpc/nx_consume_abuse_budget")||u.includes("rpc/nx_consume_chat_quota"))return res(true);
  if(u.includes("nx_whatsapp_messages"))return res(null);
  if(u==="https://qwen.example.com/api/chat")return ollamaOk?res({message:{content:"Drain cleaning costs $75."}}):res({error:"offline"},503);
  if(u.startsWith("https://graph.facebook.com/"))return res({messages:[{id:"sent"}]});
  throw Error("unexpected network request "+u);
 };
}
test("Trial eligibility is server-enforced",()=>{
 assert.equal(access({trial_started_at:null,subscription_status:"TRIAL"}).reason,"NOT_STARTED");
 assert.equal(access({trial_started_at:new Date(Date.now()-49*3600000).toISOString(),subscription_status:"TRIAL"}).allowed,false);
 assert.equal(access({trial_started_at:new Date().toISOString(),subscription_status:"SUSPENDED"}).allowed,false);
 assert.equal(access({trial_started_at:null,subscription_status:"ACTIVE"}).allowed,true);
});
test("Reject spoofed Meta webhook signature without DB access",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=()=>{throw Error("DB must not be called")};
 try{const e=webhook();e.headers["x-hub-signature-256"]="invalid";assert.equal((await whatsapp(e)).statusCode,403)}finally{globalThis.fetch=original}
});
test("Meta webhook ACKs only after durable enqueue; delivery is asynchronous",async()=>{
 configure();const original=globalThis.fetch;let queued=false,sends=0;
 globalThis.fetch=fakeNetwork({onCall:(u,p)=>{if(u.includes("rpc/nx_enqueue_whatsapp")){queued=true;assert.equal(p.p_sender,"15551234567")}if(u.includes("graph.facebook.com"))sends++}});
 try{const r=await whatsapp(webhook());assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).queued,1);assert.equal(queued,true);assert.equal(sends,0)}finally{globalThis.fetch=original}
});
test("Repeat Meta webhook is idempotent and creates no second queued job",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=fakeNetwork({enqueue:false});
 try{const r=await whatsapp(webhook());assert.equal(r.statusCode,200);assert.equal(JSON.parse(r.body).duplicates,1)}finally{globalThis.fetch=original}
});
test("Storage failure returns 503 to request a Meta retry",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=fakeNetwork({failEnqueue:true});
 try{assert.equal((await whatsapp(webhook())).statusCode,503)}finally{globalThis.fetch=original}
});
test("Scheduled worker sends tenant-grounded Ollama answer and settles lease",async()=>{
 configure();const original=globalThis.fetch;let aiInput=null,outgoing=null,settle=null;
 globalThis.fetch=fakeNetwork({onCall:(u,p)=>{if(u==="https://qwen.example.com/api/chat")aiInput=p;if(u.includes("graph.facebook.com"))outgoing=p;if(u.includes("rpc/nx_finish_whatsapp"))settle=p}});
 try{
  const outcome=await executeOnce();
  assert.equal(outcome.delivered,1);
  assert.match(JSON.stringify(aiInput),/Alpha Plumbing/);
  assert.match(JSON.stringify(aiInput),/Drain cleaning/);
  assert.match(outgoing.text.body,/\$75/);
  assert.equal(settle.p_success,true);assert.equal(settle.p_lease_id,job.lease_id);
 }finally{globalThis.fetch=original}
});
test("Failed Qwen reply stays retryable and preserves failure status",async()=>{
 configure();const original=globalThis.fetch;let settle;
 globalThis.fetch=fakeNetwork({ollamaOk:false,onCall:(u,p)=>{if(u.includes("rpc/nx_finish_whatsapp"))settle=p}});
 try{const outcome=await executeOnce();assert.equal(outcome.delivered,0);assert.equal(settle.p_success,false)}finally{globalThis.fetch=original}
});
test("Expired business cannot receive WhatsApp AI replies",async()=>{
 configure();const original=globalThis.fetch;let sent=0;
 globalThis.fetch=fakeNetwork({active:false,onCall:u=>{if(u.includes("graph.facebook.com"))sent++}});
 try{const result=await executeOnce();assert.equal(result.delivered,0);assert.equal(sent,0)}finally{globalThis.fetch=original}
});
test("Worker handles empty queue without outbound calls",async()=>{
 configure();const original=globalThis.fetch;globalThis.fetch=fakeNetwork({claim:[],onCall:u=>{if(u.includes("graph.facebook.com"))throw Error("unexpected send")}});
 try{assert.equal((await executeOnce()).processed,0)}finally{globalThis.fetch=original}
});
test("Admin requires MFA aal2 and verified super_admin account",async()=>{
 configure();const original=globalThis.fetch;
 const event=aal=>({httpMethod:"GET",headers:{authorization:"Bearer x."+Buffer.from(JSON.stringify({sub:uid,aal})).toString("base64url")+".sig"}});
 try{
  globalThis.fetch=fakeNetwork();assert.equal((await admin(event("aal1"))).statusCode,403);assert.equal((await admin(event("aal2"))).statusCode,200);
  globalThis.fetch=fakeNetwork({role:"owner"});assert.equal((await admin(event("aal2"))).statusCode,403);
  assert.equal((await admin({httpMethod:"POST",headers:{},body:'{"pin":"0000"}'})).statusCode,405);
 }finally{globalThis.fetch=original}
});
test("Store chat ignores customer-supplied business/catalog and queries private owner data",async()=>{
 configure();const original=globalThis.fetch;let aiRequest;
 globalThis.fetch=fakeNetwork({onCall:(u,p)=>{if(u==="https://qwen.example.com/api/chat")aiRequest=p}});
 try{
  const e={httpMethod:"POST",headers:{origin:"https://zapzap-bot.netlify.app",host:"zapzap-bot.netlify.app","x-nf-client-connection-ip":"198.51.100.17"},body:JSON.stringify({slug:"alpha-plumbing",message:"How much?",business:{name:"Fake Business"},catalog:[{name:"Fake $1"}]})};
  const r=await chat(e);assert.equal(r.statusCode,200);assert.match(JSON.stringify(aiRequest),/Alpha Plumbing/);assert.doesNotMatch(JSON.stringify(aiRequest),/Fake Business|Fake \$1/);
 }finally{globalThis.fetch=original}
});
test("PayPal billing remains disabled pending sandbox validation",async()=>{
 configure();delete process.env.NEXUS_BILLING_ENABLED;
 const r=await checkout({httpMethod:"POST",headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app"},body:JSON.stringify({tier:"core"})});
 assert.equal(r.statusCode,503);
});

test("Anonymous AI demo routes only fictional business catalogs through Ollama",async()=>{
 configure();
 const {handler}=await import("../netlify/functions/demo-chat.mjs");
 const original=globalThis.fetch;
 let ollama=null,quotaCalls=0;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes("/rest/v1/rpc/nx_consume_abuse_budget")){quotaCalls++;return res(true)}
  if(u==="https://qwen.example.com/api/chat"){ollama=JSON.parse(options.body);return res({message:{content:"The Harborline SUV is $24,900 in this fictional demo."}})}
  throw Error("unexpected demo request "+u);
 };
 try{
  const event={httpMethod:"POST",headers:{origin:"https://zapzap-bot.netlify.app",host:"zapzap-bot.netlify.app","x-nf-client-connection-ip":"192.0.2.18"},body:JSON.stringify({business:"auto",message:"How much is the SUV?",store_id:"forged",catalog:[{name:"Other tenant"}]})};
  const result=await handler(event);
  assert.equal(result.statusCode,200);
  assert.equal(JSON.parse(result.body).source,"ollama");
  assert.match(JSON.stringify(ollama.messages),/SunHarbor Auto/);
  assert.match(JSON.stringify(ollama.messages),/24,900/);
  assert.doesNotMatch(JSON.stringify(ollama.messages),/Other tenant|forged/);
  assert.equal(quotaCalls,3);
 }finally{globalThis.fetch=original}
});
test("Anonymous demo rejects unknown business and oversized question before calling the model",async()=>{
 configure();
 const {handler}=await import("../netlify/functions/demo-chat.mjs");
 const original=globalThis.fetch;
 globalThis.fetch=async()=>{throw Error("Must not call any external service")};
 try{
  const base={httpMethod:"POST",headers:{origin:"https://zapzap-bot.netlify.app",host:"zapzap-bot.netlify.app"}};
  assert.equal((await handler({...base,body:JSON.stringify({business:"real-store-id",message:"Hello"})})).statusCode,400);
  assert.equal((await handler({...base,body:JSON.stringify({business:"auto",message:"x".repeat(351)})})).statusCode,400);
  assert.equal((await handler({...base,headers:{origin:"https://other-site.example",host:"zapzap-bot.netlify.app"},body:JSON.stringify({business:"auto",message:"Hello"})})).statusCode,403);
 }finally{globalThis.fetch=original}
});
test("Anonymous demo rate limit refuses requests without invoking Ollama",async()=>{
 configure();
 const {handler}=await import("../netlify/functions/demo-chat.mjs");
 const original=globalThis.fetch;
 let modelCalled=false;
 globalThis.fetch=async(url)=>{
  if(String(url).includes("nx_consume_abuse_budget"))return res(false);
  if(String(url).includes("/api/chat"))modelCalled=true;
  throw Error("Unexpected network call "+url);
 };
 try{
  const event={httpMethod:"POST",headers:{origin:"https://zapzap-bot.netlify.app",host:"zapzap-bot.netlify.app"},body:JSON.stringify({business:"hvac",message:"AC pricing?"})};
  // An exhausted durable budget must return 429 without invoking the model.
  assert.equal((await handler(event)).statusCode,429);
  assert.equal(modelCalled,false);
 }finally{globalThis.fetch=original}
});

test("Owner previews their actual unpublished catalog without starting a trial",async()=>{
 configure();const {handler}=await import("../netlify/functions/owner-test-chat.mjs");
 const original=globalThis.fetch;let aiRequest=null,dbWrites=0;
 globalThis.fetch=fakeNetwork({onCall:(url,payload)=>{
  if(url==="https://qwen.example.com/api/chat")aiRequest=payload;
  if(/\/rest\/v1\/nx_(?:stores|entitlements|offerings)/.test(url)&&payload&&Object.keys(payload).length>0)dbWrites++;
 }});
 try{
  const e={httpMethod:"POST",headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app",authorization:"Bearer demo.user.token","x-nf-client-connection-ip":"198.51.100.5"},
   body:JSON.stringify({message:"How much is drain cleaning?",store_id:"attacker-other-store",business:{name:"Fake competitor"},history:[]})};
  const output=await handler(e);
  assert.equal(output.statusCode,200);
  assert.equal(JSON.parse(output.body).source,"ollama");
  assert.match(JSON.stringify(aiRequest),/Alpha Plumbing/);
  assert.match(JSON.stringify(aiRequest),/Drain cleaning/);
  assert.doesNotMatch(JSON.stringify(aiRequest),/Fake competitor|attacker-other-store/);
  assert.equal(dbWrites,0,"owner test must not publish or start trial");
 }finally{globalThis.fetch=original}
});
test("Private AI preview accepts saved business with no offerings and invents no catalog",async()=>{
 configure();const {handler}=await import("../netlify/functions/owner-test-chat.mjs");
 const previous=globalThis.fetch;let aiRequest=null;
 const base=fakeNetwork({onCall:(url,payload)=>{if(url==="https://qwen.example.com/api/chat")aiRequest=payload}});
 globalThis.fetch=async(url,options)=>{
  if(String(url).includes("/rest/v1/nx_offerings"))return res([]);
  return base(url,options);
 };
 try{
  const result=await handler({
   httpMethod:"POST",
   headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app",authorization:"Bearer demo.user.token","x-nf-client-connection-ip":"198.51.100.52"},
   body:JSON.stringify({message:"What do you know about my business?"})
  });
  assert.equal(result.statusCode,200);
  assert.equal(JSON.parse(result.body).source,"ollama");
  assert.match(JSON.stringify(aiRequest),/Alpha Plumbing/);
  assert.match(aiRequest.messages[0].content,/"catalog":\[\]/);
  assert.doesNotMatch(JSON.stringify(aiRequest),/Drain cleaning/);
 }finally{globalThis.fetch=previous}
});
test("Owner test requires authentication and existing own store",async()=>{
 configure();const {handler}=await import("../netlify/functions/owner-test-chat.mjs");
 const original=globalThis.fetch;
 let calls=0;globalThis.fetch=async(url,options)=>{calls++;
  if(String(url).includes("/auth/v1/user"))return res({error:"Unauthorized"},401);
  throw Error("Should never reach AI");
 };
 try{
  const output=await handler({httpMethod:"POST",headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app"},body:JSON.stringify({message:"Hello"})});
  assert.equal(output.statusCode,401);
  assert.equal(calls,0,"missing authorization must be rejected before any DB request");
 }finally{globalThis.fetch=original}
});
test("Owner cannot access other store when own catalog is missing",async()=>{
 configure();const {handler}=await import("../netlify/functions/owner-test-chat.mjs");
 const original=globalThis.fetch;let aiUsed=false;
 globalThis.fetch=async(url,options)=>{
  const u=String(url);
  if(u.includes("/auth/v1/user"))return res({id:uid});
  if(u.includes("/rest/v1/nx_entitlements"))return res([{user_id:uid,trial_started_at:null,subscription_status:"TRIAL"}]);
  if(u.includes("/rest/v1/nx_stores")){assert.match(u,RegExp("owner_id=eq\\."+uid));return res([])}
  if(u.includes("/api/chat"))aiUsed=true;
  throw Error("Unexpected request "+u);
 };
 try{
  const result=await handler({httpMethod:"POST",headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app",authorization:"Bearer valid.owner.token"},body:JSON.stringify({message:"Give me data from other businesses",store_id:sid})});
  assert.equal(result.statusCode,400);assert.equal(aiUsed,false);
 }finally{globalThis.fetch=original}
});

test("Permanent complimentary access ignores trial expiry and includes widget",async()=>{
 const {access,widgetEnabled}=await import("../netlify/lib/billing.mjs");
 const free={user_id:uid,is_complimentary:true,subscription_status:"TRIAL",trial_started_at:null,paypal_subscription_id:null,paypal_plan_id:null};
 const a=access(free);
 assert.equal(a.allowed,true);assert.equal(a.reason,"COMPLIMENTARY");assert.equal(a.trialEndsAt,null);
 assert.equal(widgetEnabled({widgetPlan:"paid-plan-id"},free),true);
 assert.equal(access({...free,trial_started_at:new Date(Date.now()-100*3600000).toISOString(),subscription_status:"EXPIRED"}).allowed,true);
 assert.equal(access({...free,is_complimentary:false}).allowed,false);
});
test("PayPal checkout refuses to charge a complimentary account",async()=>{
 configure();
 process.env.NEXUS_BILLING_ENABLED="true";
 process.env.PAYPAL_CLIENT_ID="test-client";process.env.PAYPAL_CLIENT_SECRET="test-secret";process.env.PAYPAL_PLAN_ID="P-TEST";
 const {handler}=await import("../netlify/functions/billing-checkout.mjs");
 const original=globalThis.fetch;let checkoutRequests=0;
 globalThis.fetch=async(url,opts={})=>{
  const u=String(url);
  if(u.includes("/v1/oauth2/token"))return res({access_token:"test-access"});
  if(u.includes("/v1/billing/plans/"))return res({status:"ACTIVE",billing_cycles:[{tenure_type:"REGULAR",frequency:{interval_unit:"MONTH",interval_count:1},pricing_scheme:{fixed_price:{currency_code:"USD",value:"149"}},total_cycles:0}]});
  if(u.includes("/auth/v1/user"))return res({id:uid});
  if(u.includes("/rest/v1/nx_entitlements"))return res([{user_id:uid,is_complimentary:true,subscription_status:"TRIAL",trial_started_at:null}]);
  if(u.includes("/v1/billing/subscriptions"))checkoutRequests++;
  throw Error("Unexpected fetch "+u);
 };
 try{
  const r=await handler({httpMethod:"POST",headers:{host:"zapzap-bot.netlify.app",origin:"https://zapzap-bot.netlify.app",authorization:"Bearer test.token"},body:JSON.stringify({tier:"core"})});
  assert.equal(r.statusCode,409);assert.equal(checkoutRequests,0);
 }finally{globalThis.fetch=original;delete process.env.NEXUS_BILLING_ENABLED;delete process.env.PAYPAL_CLIENT_ID;delete process.env.PAYPAL_CLIENT_SECRET;delete process.env.PAYPAL_PLAN_ID}
});
