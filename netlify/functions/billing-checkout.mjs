import{json,env,sameOrigin,authenticate,entitlement,db,paypal,pricing,planId}from"../lib/billing.mjs";
import{proposedEnterpriseTotal}from"../lib/market-plans.mjs";
const uuid=/^[0-9a-f-]{36}$/i;
const subscriptionPattern=/^I-[A-Z0-9]+$/i;
function validMonthlyPlan(plan,expected){
 const cycles=plan?.billing_cycles||[];
 const regular=cycles.filter(c=>c.tenure_type==="REGULAR");
 const c=regular[0],p=c?.pricing_scheme?.fixed_price;
 return plan?.status==="ACTIVE"&&regular.length===1&&cycles.length===1&&
  c?.frequency?.interval_unit==="MONTH"&&Number(c.frequency?.interval_count)===1&&
  Number(c.total_cycles)===0&&p?.currency_code==="USD"&&Number(p.value)===expected;
}
function checkoutInfo(raw){
 if(raw?.tier==="personal")return{tier:"personal",region:"NONE",employee_count:0,website_widget:false,monthly_usd:15};
 if(raw?.tier!=="business")return null;
 const count=Number(raw.employees),region=raw.region;
 if(!Number.isInteger(count)||count<3||count>100||!["BR","GLOBAL"].includes(region)||
    typeof raw.widget!=="boolean")return null;
 const quote=proposedEnterpriseTotal(region,count,raw.widget);
 return{tier:"business",region,employee_count:count,website_widget:raw.widget,monthly_usd:quote.monthlyTotal};
}
const sameOrder=(a,b)=>a.tier===b.tier&&a.region===b.region&&Number(a.employee_count)===b.employee_count&&
 a.website_widget===b.website_widget&&Number(a.monthly_usd)===b.monthly_usd;
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!sameOrigin(event))return json(403,{error:"Request origin rejected"});
 if(process.env.NEXUS_BILLING_ENABLED!=="true")return json(503,{error:"Subscriptions are not enabled yet"});
 const c=env();
 if(c.mode!=="live"||!c.clientId||!c.secret||!c.webhookId)return json(503,{error:"Live PayPal credentials/webhook missing"});
 let raw;try{raw=JSON.parse(event.body||"{}")}catch{return json(400,{error:"Invalid checkout request"})}
 const quote=checkoutInfo(raw);
 if(!quote)return json(400,{error:"Choose a valid plan, employee count and region"});
 if(raw.consent!==true)return json(400,{error:"Confirm the monthly price and recurring payment before continuing"});
 const configured=planId(c,quote.tier);
 if(!configured)return json(503,{error:"This subscription plan is not configured"});
 try{
  const user=await authenticate(event,c),ent=await entitlement(c,user.id);
  if(!ent)return json(503,{error:"Billing account is not initialized"});
  if(ent.is_complimentary===true)return json(409,{error:"Your complimentary account requires no subscription"});
  if(ent.subscription_status==="ACTIVE")return json(409,{error:"An active PayPal subscription already exists; change plans through support"});
  const existing=await db(c,"nx_billing_orders?user_id=eq."+encodeURIComponent(user.id)+
   "&status=in.(PREPARING,PENDING,APPROVED,ACTIVE)&select=*&order=created_at.desc&limit=1");
  if(existing.length){
   const row=existing[0];
   if(row.status==="ACTIVE")return json(409,{error:"Your subscription is already active"});
   if(!sameOrder(row,quote))return json(409,{error:"A previous subscription checkout is pending. Complete or cancel it before changing the quote."});
   if(!row.paypal_subscription_id||!subscriptionPattern.test(row.paypal_subscription_id))
    return json(409,{error:"Checkout is being prepared. Please contact support if it remains pending."});
   const sub=await paypal(c,"/v1/billing/subscriptions/"+encodeURIComponent(row.paypal_subscription_id));
   if(sub.custom_id!==row.id||sub.plan_id!==row.paypal_plan_id)return json(409,{error:"Subscription verification mismatch"});
   const approvalUrl=sub.links?.find(x=>x.rel==="approve"&&/^https:\/\/(?:www\.)?(?:sandbox\.)?paypal\.com\//i.test(x.href||""))?.href;
   if(approvalUrl&&["APPROVAL_PENDING","APPROVED"].includes(sub.status))return json(200,{approvalUrl,monthlyUsd:quote.monthly_usd});
   return json(409,{error:"A previous PayPal subscription requires review before retrying"});
  }
  const base=await paypal(c,"/v1/billing/plans/"+encodeURIComponent(configured));
  if(!validMonthlyPlan(base,quote.tier==="personal"?pricing.personal.amount:pricing.business.amount))
   return json(503,{error:"The PayPal LIVE base plan does not match our advertised monthly price"});
  const rows=await db(c,"nx_billing_orders",{method:"POST",body:{user_id:user.id,...quote,status:"PREPARING"},prefer:"return=representation"});
  const row=rows?.[0];if(!row||!uuid.test(row.id))throw new Error("Billing order could not be prepared");
  let selected=configured;
  if(quote.tier==="business"&&quote.monthly_usd!==pricing.business.amount){
   if(!/^PROD-[A-Z0-9]+$/i.test(base.product_id||""))throw new Error("PayPal product missing on base plan");
   const desc=quote.employee_count+" employees, "+(quote.region==="BR"?"Brazil":"Global")+
    (quote.website_widget?", website chatbot included":"")+", recurring $"+quote.monthly_usd+"/month";
   const created=await paypal(c,"/v1/billing/plans",{method:"POST",requestId:row.id,body:{
    product_id:base.product_id,name:"NexusSales AI Business: "+desc.slice(0,95),description:desc.slice(0,120),status:"ACTIVE",
    billing_cycles:[{frequency:{interval_unit:"MONTH",interval_count:1},tenure_type:"REGULAR",sequence:1,
      total_cycles:0,pricing_scheme:{fixed_price:{currency_code:"USD",value:quote.monthly_usd.toFixed(2)}}}],
    payment_preferences:{auto_bill_outstanding:true,setup_fee:{currency_code:"USD",value:"0.00"},payment_failure_threshold:1}
   }});
   if(!/^P-[A-Z0-9]+$/i.test(created.id||""))throw new Error("PayPal quote plan could not be created");
   selected=created.id;
  }
  await db(c,"nx_billing_orders?id=eq."+encodeURIComponent(row.id),{method:"PATCH",
   body:{paypal_plan_id:selected,updated_at:new Date().toISOString()},prefer:"return=minimal"});
  const origin="https://"+(event.headers.host||"");
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin))throw new Error("Invalid site origin");
  const sub=await paypal(c,"/v1/billing/subscriptions",{method:"POST",requestId:row.id,body:{
   plan_id:selected,custom_id:row.id,
   application_context:{brand_name:"NexusSales AI",user_action:"SUBSCRIBE_NOW",shipping_preference:"NO_SHIPPING",
    return_url:origin+"/account.html?billing=approved",cancel_url:origin+"/account.html?billing=cancelled"}
  }});
  const approvalUrl=sub.links?.find(x=>x.rel==="approve"&&/^https:\/\/(?:www\.)?(?:sandbox\.)?paypal\.com\//i.test(x.href||""))?.href;
  if(!subscriptionPattern.test(sub.id||"")||!approvalUrl)throw new Error("PayPal did not return a valid subscription approval");
  await db(c,"nx_billing_orders?id=eq."+encodeURIComponent(row.id),{method:"PATCH",
   body:{paypal_subscription_id:sub.id,status:"PENDING",updated_at:new Date().toISOString()},prefer:"return=minimal"});
  return json(200,{approvalUrl,monthlyUsd:quote.monthly_usd,employees:quote.employee_count,
    widget:quote.website_widget,currency:"USD"});
 }catch(e){console.error("Live PayPal checkout:",e.message);
  return json(e.status||503,{error:e.status===401?"Sign in to continue":"Unable to start verified PayPal checkout. No new payment was approved."})}
}
