import{json,env,configReady,db,paypal,paypalToken,api}from"../lib/billing.mjs";
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 const c=env();
 if(!configReady(c)||!c.webhookId||!c.clientId||!c.secret)return json(503,{error:"Webhook not configured"});
 if(!event.body||event.body.length>100000)return json(400,{error:"Invalid payload"});
 let payload;try{payload=JSON.parse(event.body)}catch{return json(400,{error:"Invalid JSON"})}
 const h=event.headers;
 const required=["paypal-transmission-id","paypal-transmission-time","paypal-transmission-sig","paypal-cert-url","paypal-auth-algo"];
 if(required.some(k=>!h[k]))return json(401,{error:"Missing webhook signature"});
 // Verify the original PayPal notification BEFORE touching subscription data.
 try{
  const token=await paypalToken(c);
  const res=await fetch(api(c)+"/v1/notifications/verify-webhook-signature",{
   method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},
   body:JSON.stringify({transmission_id:h["paypal-transmission-id"],transmission_time:h["paypal-transmission-time"],
    cert_url:h["paypal-cert-url"],auth_algo:h["paypal-auth-algo"],transmission_sig:h["paypal-transmission-sig"],
    webhook_id:c.webhookId,webhook_event:payload}),signal:AbortSignal.timeout(15000)
  });
  if(!res.ok)return json(503,{error:"Webhook verification unavailable"});
  const verification=await res.json();
  if(verification.verification_status!=="SUCCESS")return json(401,{error:"Invalid webhook signature"});
  const type=String(payload.event_type||"");
  if(!type.startsWith("BILLING.SUBSCRIPTION."))return json(200,{received:true});
  const id=String(payload.resource?.id||"");
  if(!/^I-[A-Z0-9]+$/i.test(id))return json(200,{received:true});
  // Always query PayPal's current status, not the untrusted order of webhook delivery.
  const sub=await paypal(c,"/v1/billing/subscriptions/"+encodeURIComponent(id));
  if(!/^[0-9a-f-]{36}$/i.test(sub.custom_id||"")||![c.plan,c.widgetPlan].filter(Boolean).includes(sub.plan_id))return json(200,{received:true});
  const rows=await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(sub.custom_id)+"&select=paypal_subscription_id");
  if(!rows?.length||rows[0].paypal_subscription_id!==id)return json(200,{received:true});
  const map={ACTIVE:"ACTIVE",SUSPENDED:"SUSPENDED",CANCELLED:"CANCELLED",EXPIRED:"EXPIRED"};
  const status=map[sub.status]||"PENDING";
  await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(sub.custom_id),{method:"PATCH",body:{
   subscription_status:status,updated_at:new Date().toISOString()
  },prefer:"return=minimal"});
  return json(200,{received:true});
 }catch(e){console.error("PayPal webhook error:",e.message);return json(503,{error:"Webhook processing unavailable"})}
}