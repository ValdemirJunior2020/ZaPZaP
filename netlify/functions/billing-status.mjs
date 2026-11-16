import{json,env,authenticate,entitlement,access}from"../lib/billing.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const c=env();
 try{
  const user=await authenticate(event,c);
  const record=await entitlement(c,user.id);
  if(!record)return json(503,{error:"Account billing setup is incomplete"});
  return json(200,{...access(record),planConfigured:Boolean(process.env.NEXUS_BILLING_ENABLED==='true'&&c.plan&&c.clientId&&c.secret),checkoutMode:c.mode});
 }catch(e){console.error("Billing status:",e.message);return json(e.status||503,{error:e.status===401?"Please sign in":"Billing service unavailable"})}
}