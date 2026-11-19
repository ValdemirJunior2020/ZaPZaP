import{json,env,configReady,db,paypal,paypalToken,api}from"../lib/billing.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i;
const subId=/^I-[A-Z0-9]+$/i;
const statuses={ACTIVE:"ACTIVE",SUSPENDED:"SUSPENDED",CANCELLED:"CANCELLED",EXPIRED:"EXPIRED",APPROVED:"APPROVED"};
function validPlanPrice(plan,expected){
 const reg=(plan?.billing_cycles||[]).filter(x=>x.tenure_type==="REGULAR");
 return plan?.status==="ACTIVE"&&reg.length===1&&(plan.billing_cycles||[]).length===1&&
  reg[0].frequency?.interval_unit==="MONTH"&&Number(reg[0].frequency?.interval_count)===1&&
  Number(reg[0].total_cycles)===0&&reg[0].pricing_scheme?.fixed_price?.currency_code==="USD"&&
  Number(reg[0].pricing_scheme?.fixed_price?.value)===Number(expected);
}
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 const c=env();
 if(!configReady(c)||!c.webhookId||!c.clientId||!c.secret)return json(503,{error:"Webhook not configured"});
 if(!event.body||event.body.length>100000)return json(400,{error:"Invalid payload"});
 let payload;try{payload=JSON.parse(event.body)}catch{return json(400,{error:"Invalid JSON"})}
 const h=Object.fromEntries(Object.entries(event.headers||{}).map(([key,value])=>[key.toLowerCase(),value]));
 const required=["paypal-transmission-id","paypal-transmission-time","paypal-transmission-sig","paypal-cert-url","paypal-auth-algo"];
 if(required.some(k=>!h[k]))return json(401,{error:"Missing webhook signature"});
 try{
  const token=await paypalToken(c);
  const res=await fetch(api(c)+"/v1/notifications/verify-webhook-signature",{
   method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
   body:JSON.stringify({transmission_id:h["paypal-transmission-id"],transmission_time:h["paypal-transmission-time"],
    cert_url:h["paypal-cert-url"],auth_algo:h["paypal-auth-algo"],transmission_sig:h["paypal-transmission-sig"],
    webhook_id:c.webhookId,webhook_event:payload}),signal:AbortSignal.timeout(15000)
  });
  if(!res.ok)return json(503,{error:"Webhook verification unavailable"});
  if((await res.json()).verification_status!=="SUCCESS")return json(401,{error:"Invalid webhook signature"});
  const type=String(payload.event_type||"");
  if(!type.startsWith("BILLING.SUBSCRIPTION."))return json(200,{received:true});
  const id=String(payload.resource?.id||"");
  if(!subId.test(id))return json(200,{received:true});
  // We never trust event order, status or plan from the inbound payload.
  const sub=await paypal(c,"/v1/billing/subscriptions/"+encodeURIComponent(id));
  const custom=String(sub.custom_id||"");
  if(!uuid.test(custom)||!subId.test(sub.id||"")||sub.id!==id)return json(200,{received:true});
  const rows=await db(c,"nx_billing_orders?id=eq."+encodeURIComponent(custom)+"&select=*&limit=1");
  const order=rows?.[0];
  if(order){
   if(order.paypal_subscription_id!==id||order.paypal_plan_id!==sub.plan_id){
    console.warn("PayPal order/plan ownership mismatch");
    return json(409,{error:"Subscription does not match the registered billing order"});
   }
   const plan=await paypal(c,"/v1/billing/plans/"+encodeURIComponent(sub.plan_id));
   if(!validPlanPrice(plan,order.monthly_usd))return json(503,{error:"Subscription amount verification failed"});
   const entRows=await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(order.user_id)+
    "&select=user_id,paypal_subscription_id,subscription_status,is_complimentary");
   const ent=entRows?.[0];
   if(!ent||ent.is_complimentary===true)return json(409,{error:"Billing owner unavailable"});
   if(ent.subscription_status==="ACTIVE"&&ent.paypal_subscription_id&&ent.paypal_subscription_id!==id)
    return json(409,{error:"Another active subscription belongs to this account"});
   const status=statuses[sub.status]||"PENDING";
   await db(c,"nx_billing_orders?id=eq."+encodeURIComponent(order.id)+
    "&paypal_subscription_id=eq."+encodeURIComponent(id),{method:"PATCH",body:{status,updated_at:new Date().toISOString()},prefer:"return=minimal"});
   // Only ACTUAL PayPal ACTIVE status enables paid access, never approval redirects.
   if(status==="ACTIVE"||ent.paypal_subscription_id===id){
    await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(order.user_id),{method:"PATCH",body:{
     subscription_status:status,paypal_subscription_id:id,paypal_plan_id:sub.plan_id,
     billing_tier:order.tier,billing_region:order.region,
     billing_employee_limit:order.tier==="business"?order.employee_count:0,
     billing_widget:order.tier==="business"&&order.website_widget,
     updated_at:new Date().toISOString()
    },prefer:"return=minimal"});
   }
   return json(200,{received:true});
  }
  // Preserve existing legacy subscriptions, never approve a new plan via the legacy route.
  if(![c.plan,c.widgetPlan].filter(Boolean).includes(sub.plan_id))return json(200,{received:true});
  const entRows=await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(custom)+
   "&select=paypal_subscription_id,is_complimentary");
  if(!entRows?.length||entRows[0].is_complimentary===true||entRows[0].paypal_subscription_id!==id)
   return json(200,{received:true});
  await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(custom),{method:"PATCH",body:{
   subscription_status:statuses[sub.status]||"PENDING",updated_at:new Date().toISOString()
  },prefer:"return=minimal"});
  return json(200,{received:true});
 }catch(e){console.error("PayPal webhook:",e.message);return json(e.status||503,{error:"Webhook processing unavailable"})}
}
