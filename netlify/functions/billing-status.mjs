import{json,env,authenticate,entitlement,access,widgetEnabled}from"../lib/billing.mjs";
import{PLANNED_CATALOG}from"../lib/market-plans.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const c=env();
 try{
  const user=await authenticate(event,c);
  const record=await entitlement(c,user.id);
  if(!record)return json(503,{error:"Account billing setup is incomplete"});
  const enabled=process.env.NEXUS_BILLING_ENABLED==="true"&&c.mode==="live"&&Boolean(c.clientId&&c.secret&&c.webhookId);
  return json(200,{...access(record),widgetEnabled:widgetEnabled(c,record),
   planConfigured:false,widgetPlanConfigured:false,
   checkoutReady:enabled&&Boolean(c.businessPlan),personalCheckoutReady:enabled&&Boolean(c.personalPlan),
   checkoutMode:c.mode,billingEnabled:enabled,prices:{
    businessBase:PLANNED_CATALOG.enterpriseBaseUsd,includedEmployees:PLANNED_CATALOG.includedEmployees,
    additionalEmployeeBrazil:PLANNED_CATALOG.extraEmployeeBrazilUsd,
    additionalEmployeeGlobal:PLANNED_CATALOG.extraEmployeeGlobalUsd,
    widgetAddon:PLANNED_CATALOG.websiteWidgetUsd,personalBasic:PLANNED_CATALOG.personalBasicUsd}});
 }catch(e){console.error("Billing status:",e.message);return json(e.status||503,{error:e.status===401?"Please sign in":"Billing service unavailable"})}
}
