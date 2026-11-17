import test from "node:test";
import assert from "node:assert/strict";
import{cancelSubscription,deleteAccount}from"../netlify/lib/account-lifecycle.mjs";
import{readFile}from"node:fs/promises";
import{resolve}from"node:path";
const user={id:"22222222-2222-4222-8222-222222222222",email:"user@example.com"};
const ent={user_id:user.id,paypal_subscription_id:"I-123456789ABCDE",paypal_plan_id:"P-TEST",subscription_status:"ACTIVE",is_complimentary:false};
const cfg={supabaseUrl:"https://test.supabase.co",supabaseKey:"sb_secret_example",clientId:"sample",secret:"sample",mode:"sandbox"};
const reply=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
function fake({subscription="ACTIVE",invalidPassword=false,cancelFail=false,authDeleteFail=false}={}){
 const calls=[];let current=subscription;
 const fn=async(url,options={})=>{
  const u=String(url),method=options.method||"GET";calls.push({url:u,method});
  if(u.includes("/v1/oauth2/token"))return reply({access_token:"token"});
  if(u.includes("/v1/billing/subscriptions/")){
   if(method==="GET")return reply({id:ent.paypal_subscription_id,custom_id:user.id,plan_id:"P-TEST",status:current});
   if(u.endsWith("/cancel")){if(cancelFail)return reply({error:"fail"},503);current="CANCELLED";return reply(null,204)}
  }
  if(u.includes("/rest/v1/nx_entitlements"))return reply(null,204);
  if(u.includes("/auth/v1/token?grant_type=password"))return invalidPassword?reply({error:"bad"},400):reply({user:{id:user.id},access_token:"verified"});
  if(u.includes("/auth/v1/admin/users/"))return authDeleteFail?reply({error:"failed"},503):reply({},200);
  throw Error("Unexpected URL "+u);
 };
 return{fn,calls};
}
test("Cancellation is blocked for complimentary owners and does not contact PayPal",async()=>{
 const prev=globalThis.fetch;const f=fake();globalThis.fetch=f.fn;
 try{const r=await cancelSubscription(cfg,user,{...ent,is_complimentary:true});assert.equal(r.statusCode,409);assert.equal(f.calls.length,0)}
 finally{globalThis.fetch=prev}
});
test("PayPal cancellation is confirmed before reporting successful cancellation",async()=>{
 const prev=globalThis.fetch;const f=fake();globalThis.fetch=f.fn;
 try{const r=await cancelSubscription(cfg,user,ent);assert.equal(r.statusCode,200);assert.match(r.body,/cancelled/i);assert.equal(f.calls.filter(x=>x.url.endsWith("/cancel")).length,1)}
 finally{globalThis.fetch=prev}
});
test("Wrong password blocks account deletion before PayPal cancellation or Auth admin",async()=>{
 const prev=globalThis.fetch;const f=fake({invalidPassword:true});globalThis.fetch=f.fn;
 try{await assert.rejects(deleteAccount(cfg,user,ent,{confirmText:"DELETE MY ACCOUNT",password:"incorrectpassword"}),/Password verification failed/);
 assert.equal(f.calls.filter(x=>x.url.includes("paypal.com")).length,0);
 assert.equal(f.calls.filter(x=>x.url.includes("/admin/users")).length,0)}
 finally{globalThis.fetch=prev}
});
test("Failed PayPal cancellation never deletes the Supabase identity",async()=>{
 const prev=globalThis.fetch;const f=fake({cancelFail:true});globalThis.fetch=f.fn;
 try{await assert.rejects(deleteAccount(cfg,user,ent,{confirmText:"DELETE MY ACCOUNT",password:"correctpassword"}));
 assert.equal(f.calls.filter(x=>x.url.includes("/admin/users")).length,0)}
 finally{globalThis.fetch=prev}
});
test("Deletion confirms password and cancels paid subscription before removing Auth user",async()=>{
 const prev=globalThis.fetch;const f=fake();globalThis.fetch=f.fn;
 try{const r=await deleteAccount(cfg,user,ent,{confirmText:"DELETE MY ACCOUNT",password:"correctpassword"});
 assert.equal(r.statusCode,200);
 const cancel=f.calls.findIndex(x=>x.url.endsWith("/cancel"));
 const deleted=f.calls.findIndex(x=>x.url.includes("/admin/users/"));
 assert.ok(cancel>=0&&deleted>cancel)}
 finally{globalThis.fetch=prev}
});
test("No password or confirmation phrase means no account deletion",async()=>{
 const prev=globalThis.fetch;const f=fake();globalThis.fetch=f.fn;
 try{const r=await deleteAccount(cfg,user,ent,{confirmText:"DELETE",password:"correctpassword"});
 assert.equal(r.statusCode,400);assert.equal(f.calls.length,0)}
 finally{globalThis.fetch=prev}
});
test("Account lifecycle browser script is syntactically valid",async()=>{
 const script=await readFile(resolve("account-settings.js"),"utf8");
 assert.doesNotThrow(()=>new Function(script));
 const html=await readFile(resolve("account.html"),"utf8");
 assert.match(html,/id="forgotPassword"/);
 assert.match(html,/id="resetPanel"/);
 assert.match(html,/id="accountSettings"/);
 assert.match(html,/src="\/account-settings.js"/);
});
