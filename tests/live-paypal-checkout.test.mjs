import test from "node:test";
import assert from "node:assert/strict";
import {handler as checkout} from "../netlify/functions/billing-checkout.mjs";
import {handler as webhook} from "../netlify/functions/billing-webhook.mjs";
import {proposedEnterpriseTotal} from "../netlify/lib/market-plans.mjs";
const uid="22222222-2222-4222-8222-222222222222";
const orderId="33333333-3333-4333-8333-333333333333";
const res=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,text:async()=>JSON.stringify(data)});
const req=(payload)=>({httpMethod:"POST",headers:{origin:"https://example.com",host:"example.com",authorization:"Bearer test.jwt"},body:JSON.stringify(payload)});
const regular=value=>({status:"ACTIVE",product_id:"PROD-ABCD1234EFGH56789",billing_cycles:[{tenure_type:"REGULAR",frequency:{interval_unit:"MONTH",interval_count:1},total_cycles:0,pricing_scheme:{fixed_price:{value:String(value),currency_code:"USD"}}}]});
function live(){
 Object.assign(process.env,{NEXUS_BILLING_ENABLED:"true",PAYPAL_MODE:"live",PAYPAL_CLIENT_ID:"test-client",PAYPAL_CLIENT_SECRET:"test-secret",PAYPAL_WEBHOOK_ID:"test-webhook",
 PAYPAL_BUSINESS_PLAN_ID:"P-BASE",PAYPAL_PERSONAL_BASIC_PLAN_ID:"P-PERSONAL",NEXUS_SUPABASE_URL:"https://db.example.com",NEXUS_SUPABASE_SECRET_KEY:"sb_secret_test"});
}
function restore(){
 for(const k of ["NEXUS_BILLING_ENABLED","PAYPAL_MODE","PAYPAL_CLIENT_ID","PAYPAL_CLIENT_SECRET","PAYPAL_WEBHOOK_ID","PAYPAL_BUSINESS_PLAN_ID","PAYPAL_PERSONAL_BASIC_PLAN_ID","NEXUS_SUPABASE_URL","NEXUS_SUPABASE_SECRET_KEY"])delete process.env[k];
}
test("Business quote is server-owned and exactly matches geographical employee pricing",()=>{
 assert.equal(proposedEnterpriseTotal("GLOBAL",5,true).monthlyTotal,678);
 assert.equal(proposedEnterpriseTotal("BR",5,true).monthlyTotal,638);
 assert.equal(proposedEnterpriseTotal("BR",3,false).monthlyTotal,499);
});
test("LIVE checkout creates one verified recurring subscription for full $678, not separate add-on subscriptions",async()=>{
 live();const old=globalThis.fetch;let plans=0,subs=0,updates=0,quoted=0;
 const fetcher=async(url,opt={})=>{
  const u=String(url),body=opt.body&&opt.headers?.["Content-Type"]==="application/json"?JSON.parse(opt.body):null;
  if(u.endsWith("/auth/v1/user"))return res({id:uid});
  if(u.includes("/nx_entitlements"))return res([{user_id:uid,subscription_status:"TRIAL",is_complimentary:false}]);
  if(u.includes("/nx_billing_orders")&&opt.method==="POST"){
   assert.equal(body.monthly_usd,678);assert.equal(body.employee_count,5);assert.equal(body.website_widget,true);
   quoted++;
   return res([{id:orderId,user_id:uid,...body}]);
  }
  if(u.includes("/nx_billing_orders")&&opt.method==="PATCH"){updates++;return res([]);}
  if(u.includes("/nx_billing_orders"))return res([]);
  if(u.endsWith("/v1/oauth2/token"))return res({access_token:"test-token"});
  if(u.endsWith("/v1/billing/plans/P-BASE"))return res(regular(499));
  if(u.endsWith("/v1/billing/plans")&&opt.method==="POST"){
   plans++;assert.equal(body.billing_cycles[0].pricing_scheme.fixed_price.value,"678.00");
   assert.equal(body.payment_preferences.setup_fee.value,"0.00");
   return res({id:"P-DYNAMIC"});
  }
  if(u.endsWith("/v1/billing/subscriptions")&&opt.method==="POST"){
   subs++;assert.equal(body.plan_id,"P-DYNAMIC");assert.equal(body.custom_id,orderId);
   return res({id:"I-TESTABCDE",links:[{rel:"approve",href:"https://www.paypal.com/checkoutnow?token=abc"}]});
  }
  throw Error("Unexpected request: "+u);
 };
 globalThis.fetch=fetcher;
 try{
  const r=await checkout(req({tier:"business",region:"GLOBAL",employees:5,widget:true,consent:true}));
  assert.equal(r.statusCode,200,r.body);
  assert.equal(JSON.parse(r.body).monthlyUsd,678);
  assert.equal(plans,1);assert.equal(subs,1);assert.equal(quoted,1);assert.equal(updates,2);
 }finally{globalThis.fetch=old;restore()}
});
test("PayPal LIVE checkout cannot proceed without explicit recurring consent",async()=>{
 live();const old=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error("No network allowed")};
 try{
  const r=await checkout(req({tier:"personal",consent:false}));
  assert.equal(r.statusCode,400);assert.equal(calls,0);
 }finally{globalThis.fetch=old;restore()}
});
test("A signed LIVE webhook verifies PayPal amount and then activates one correct business entitlement",async()=>{
 live();const old=globalThis.fetch;let entitled=null,orderStatus=null;
 globalThis.fetch=async(url,opt={})=>{
  const u=String(url),body=opt.body&&opt.headers?.["Content-Type"]==="application/json"?JSON.parse(opt.body):null;
  if(u.endsWith("/v1/oauth2/token"))return res({access_token:"token"});
  if(u.endsWith("/v1/notifications/verify-webhook-signature"))return res({verification_status:"SUCCESS"});
  if(u.endsWith("/v1/billing/subscriptions/I-TESTABCDE"))return res({id:"I-TESTABCDE",custom_id:orderId,plan_id:"P-DYNAMIC",status:"ACTIVE"});
  if(u.endsWith("/v1/billing/plans/P-DYNAMIC"))return res(regular(678));
  if(u.includes("/nx_billing_orders")&&opt.method==="PATCH"){orderStatus=body.status;return res([])}
  if(u.includes("/nx_billing_orders"))return res([{id:orderId,user_id:uid,tier:"business",region:"GLOBAL",employee_count:5,website_widget:true,monthly_usd:678,paypal_plan_id:"P-DYNAMIC",paypal_subscription_id:"I-TESTABCDE"}]);
  if(u.includes("/nx_entitlements")&&opt.method==="PATCH"){entitled=body;return res([])}
  if(u.includes("/nx_entitlements"))return res([{user_id:uid,is_complimentary:false,subscription_status:"TRIAL",paypal_subscription_id:null}]);
  throw Error("Unexpected webhook URL: "+u);
 };
 try{
  const payload={event_type:"BILLING.SUBSCRIPTION.ACTIVATED",resource:{id:"I-TESTABCDE"}};
  const e={httpMethod:"POST",headers:{"paypal-transmission-id":"id","paypal-transmission-time":"time","paypal-transmission-sig":"sig","paypal-cert-url":"https://api-m.paypal.com/cert","paypal-auth-algo":"SHA256"},body:JSON.stringify(payload)};
  const result=await webhook(e);
  assert.equal(result.statusCode,200,result.body);
  assert.equal(orderStatus,"ACTIVE");assert.equal(entitled?.billing_employee_limit,5);
  assert.equal(entitled?.billing_widget,true);assert.equal(entitled?.subscription_status,"ACTIVE");
 }finally{globalThis.fetch=old;restore()}
});
