import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {handler as workspace} from "../netlify/functions/owner-workspace.mjs";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");
const uid="22222222-2222-4222-8222-222222222222";
const id="11111111-1111-4111-8111-111111111111";
const response=(value,status=200)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(value),json:async()=>value});
function setup(){process.env.NEXUS_SUPABASE_URL="https://test.supabase.co";process.env.NEXUS_SUPABASE_SECRET_KEY="sb_secret_test";}
function ownerEvent(action,extra={}){return{httpMethod:"POST",headers:{host:"example.com",origin:"https://example.com",authorization:"Bearer test.token"},body:JSON.stringify({action,...extra})}};
test("personal signup mode does not require business phone number and has a named path",async()=>{
 const [ui,index,business]=await Promise.all(["business.js","index.html","business.html"].map(read));
 assert.match(ui,/accountKind==="personal"/);
 assert.match(ui,/data:accountKind==="personal"\?/);
 assert.match(ui,/account_kind:"personal"/);
 assert.match(ui,/!signingUp\|\|personal/);
 for(const html of [index,business]){
  assert.match(html,/data-account-kind="personal"/);
  assert.match(html,/id="authPhoneWrap"/);
  assert.match(html,/id="authNameLabel"/);
 }
});
test("personal account can provision a private tenant container without a SmartStore catalog",async()=>{
 setup();
 const original=globalThis.fetch;
 let row=null;
 globalThis.fetch=async(url,options={})=>{
  const u=String(url);
  if(u.includes("/auth/v1/user"))return response({id:uid,email:"personal@example.invalid",user_metadata:{account_kind:"personal"}});
  if(u.includes("/nx_entitlements"))return response([{user_id:uid,subscription_status:"TRIAL",trial_started_at:null,is_complimentary:false}]);
  if(u.includes("/nx_stores")&&options.method==="POST"){row=JSON.parse(options.body);return response([{id,...row}]);}
  if(u.includes("/nx_stores"))return response([]);
  throw Error("Unexpected request "+u);
 };
 try{
  const result=await workspace(ownerEvent("initialize_personal_workspace",{displayName:"Maya"}));
  assert.equal(result.statusCode,200);
  assert.equal(JSON.parse(result.body).store.id,id);
  assert.equal(row.owner_id,uid);
  assert.equal(row.published,false);
  assert.match(row.slug,/^personal-[a-f0-9]{24}$/);
  assert.equal(row.industry,"Personal Assistant");
 }finally{globalThis.fetch=original}
});
test("personal trial requires an explicit activation action and a verified hosted AI",async()=>{
 const [backend,ui]=await Promise.all(["netlify/functions/owner-workspace.mjs","business.js"].map(read));
 assert.match(backend,/if\(action==="activate_personal"\)/);
 assert.match(backend,/if\(!await verifyHostedAI\(\)\)/);
 assert.match(backend,/trial_started_at=is\.null/);
 assert.match(backend,/Save and enable your personal assistant first/);
 assert.match(ui,/activatePersonalTrial/);
 assert.match(ui,/This address is reserved but not publicly active/);
 assert.match(ui,/activate_personal/);
});
