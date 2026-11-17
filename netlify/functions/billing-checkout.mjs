import{json,env,sameOrigin,authenticate,entitlement,access,db,paypal,pricing,planId}from"../lib/billing.mjs";
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!sameOrigin(event))return json(403,{error:"Request origin rejected"});
 const c=env();
 if(process.env.NEXUS_BILLING_ENABLED!=="true")return json(503,{error:"Subscriptions are not enabled yet"});
 if(!c.clientId||!c.secret)return json(503,{error:"PayPal subscriptions are not configured yet"});
 try{
  let req;try{req=JSON.parse(event.body||"{}")}catch{return json(400,{error:"Invalid JSON"})}
  const tier=req.tier==="core_widget"?"core_widget":req.tier==="core"?"core":null;
  if(!tier)return json(400,{error:"Select a valid subscription plan"});
  const selected=planId(c,tier);
  if(!selected)return json(503,{error:"Selected PayPal plan is not configured yet"});
  // Authenticate and reject complimentary/active accounts before making any PayPal API requests.
  const user=await authenticate(event,c);
  const record=await entitlement(c,user.id);
  if(!record)return json(503,{error:"Account billing setup is incomplete"});
  if(record.is_complimentary===true)return json(409,{error:"This account has permanent complimentary access. No subscription is required."});
  if(record.subscription_status==="ACTIVE")return json(409,{error:"Subscription already active"});
  // Server independently validates price, currency and recurrence against the LIVE/Sandbox plan
  // selected by the deployment. Never trust a browser-provided amount or PayPal button snippet.
  const plan=await paypal(c,"/v1/billing/plans/"+encodeURIComponent(selected));
  const regular=(plan.billing_cycles||[]).filter(x=>x.tenure_type==="REGULAR");
  const price=regular[0]?.pricing_scheme?.fixed_price;
  if(plan.status!=="ACTIVE"||regular.length!==1||regular[0].frequency?.interval_unit!=="MONTH"||
     Number(regular[0].frequency?.interval_count)!==1||price?.currency_code!=="USD"||
     Number(price?.value)!==pricing[tier].amount||Number(regular[0].total_cycles)!==0||
     (plan.billing_cycles||[]).some(x=>x.tenure_type==="TRIAL")){
    return json(503,{error:"PayPal plan price or frequency does not match the chosen subscription"});
  }
  if(record.paypal_subscription_id){
   const old=await paypal(c,"/v1/billing/subscriptions/"+encodeURIComponent(record.paypal_subscription_id));
   if(old.custom_id===user.id&&old.plan_id===selected&&["APPROVAL_PENDING","APPROVED"].includes(old.status)){
    const url=old.links?.find(x=>x.rel==="approve"&&x.href?.startsWith("https://"))?.href;
    if(url)return json(200,{approvalUrl:url});
   }
   if(old.status==="ACTIVE")return json(409,{error:"An active subscription already exists. To change plans, contact support before starting another subscription."});
  }
  const origin="https://"+(event.headers.host||"");
  if(!/^https:\/\/[a-z0-9.-]+$/i.test(origin))return json(403,{error:"Invalid site host"});
  const created=await paypal(c,"/v1/billing/subscriptions",{method:"POST",body:{
   plan_id:selected,custom_id:user.id,
   application_context:{brand_name:"NexusSales AI",user_action:"SUBSCRIBE_NOW",shipping_preference:"NO_SHIPPING",
    return_url:origin+"/account.html?billing=approved",cancel_url:origin+"/account.html?billing=cancelled"}
  }});
  const approvalUrl=created.links?.find(x=>x.rel==="approve"&&x.href?.startsWith("https://"))?.href;
  if(!created.id||!approvalUrl)throw new Error("PayPal approval URL unavailable");
  await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(user.id),{method:"PATCH",body:{
    paypal_subscription_id:created.id,paypal_plan_id:selected,
    subscription_status:"PENDING",updated_at:new Date().toISOString()
   },prefer:"return=minimal"});
  return json(200,{approvalUrl});
 }catch(e){console.error("Billing checkout failed:",e.message);return json(e.status||503,{error:e.status===401?"Please sign in":"Checkout is temporarily unavailable"})}
}