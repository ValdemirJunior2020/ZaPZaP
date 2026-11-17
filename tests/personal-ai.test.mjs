import test from"node:test";
import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import{juniorMessages,JUNIOR_OWNER_ID}from"../netlify/lib/junior-assistant.mjs";
import{handler as inquiry}from"../netlify/functions/store-inquiry.mjs";
const storeId="b6bdb48c-6855-4e80-a529-96b6d18e904b";
const store={id:storeId,owner_id:JUNIOR_OWNER_ID,slug:"my-store",published:true,appointments_enabled:true};
const ent={user_id:JUNIOR_OWNER_ID,is_complimentary:true,subscription_status:"ACTIVE"};
const res=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
test("Faith-inspired assistant identifies itself as AI and keeps sales contextual",()=>{
 const system=juniorMessages("Hi")[0].content;
 assert.match(system,/NOT Junior/);
 assert.match(system,/Christian values/);
 assert.match(system,/only if|ONLY if/i);
 assert.match(system,/NexusSales AI/);
 assert.match(system,/do not advertise/i);
 assert.match(system,/contact form/i);
 assert.match(system,/Never claim|never claim/i);
});
test("Public landing page and owner dashboard expose the same NexusSales feature",async()=>{
 const [ui,js,build,vercel,dashboard,owner]=await Promise.all(["junior.html","junior.js","scripts/build-vercel.mjs","vercel.json","business.js","netlify/functions/owner-workspace.mjs"].map(x=>readFile(x,"utf8")));
 assert.match(ui,/src="\/junior.js"/);
 assert.match(js,/experience:"junior"/);
 assert.match(vercel,/"source": "\/assistant"/);
 assert.match(build,/"junior.html","junior.js"/);
 assert.match(dashboard,/Personal AI/);
 assert.match(dashboard,/Leads & Chats/);
 assert.match(owner,/JUNIOR_OWNER_ID/);
 assert.doesNotThrow(()=>new Function(js));
});
test("Hope inquiry is linked to owner Lead Center and never trusts spoofed store slug",async()=>{
 const previous=globalThis.fetch;
 Object.assign(process.env,{NEXUS_SUPABASE_URL:"https://test.supabase.co",NEXUS_SUPABASE_SECRET_KEY:"sb_secret_fake",NEXUS_ABUSE_SECRET:"abcdefghijklmnopqrstuvwxy1234567890"});
 let saved=null;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  const body=options.body?JSON.parse(options.body):{};
  if(u.includes("nx_consume_abuse_budget"))return res(true);
  if(u.includes("/nx_stores"))return res([store]);
  if(u.includes("/nx_entitlements"))return res([ent]);
  if(u.includes("/nx_offerings"))return res([]);
  if(u.includes("/nx_leads")&&options.method==="POST"){saved=body;return res([{id:"66666666-6666-4666-8666-666666666666"}],201)}
  throw Error("Unexpected URL "+u);
 };
 try{
  const event={httpMethod:"POST",headers:{origin:"https://za-p-za-p.vercel.app",host:"za-p-za-p.vercel.app"},body:JSON.stringify({experience:"junior",slug:"spoofed-other-store",name:"Alex Tester",email:"alex@example.com",phone:"",interest:"Please tell me about NexusSales AI",requestType:"information"})};
  const r=await inquiry(event);
  assert.equal(r.statusCode,201);
  assert.equal(saved.store_id,storeId);
  assert.match(saved.interest,/Hope personal assistant/);
 }finally{globalThis.fetch=previous}
});
