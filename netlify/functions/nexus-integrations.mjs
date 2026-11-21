import{env,json}from"../lib/billing.mjs";
import{userFrom,ownStore,postOrigin,parse}from"../lib/tenant.mjs";
import{catalog,currencyRate,publicHolidays}from"../lib/nexus-free-integrations.mjs";
export async function handler(event){
 if(!["GET","POST"].includes(event.httpMethod))return json(405,{error:"Method not allowed"});
 if(event.httpMethod==="POST"&&!postOrigin(event))return json(403,{error:"Origin rejected"});
 try{
  const c=env(),{user,ent}=await userFrom(event,c);
  if(!ent)return json(403,{error:"Account unavailable"});
  const store=await ownStore(c,user.id);if(!store)return json(403,{error:"Business profile required"});
  if(event.httpMethod==="GET")return json(200,{integrations:catalog()});
  const p=parse(event,2000),action=String(p.action||"");
  if(action==="currency")return json(200,{result:await currencyRate(p.base,p.quote)});
  if(action==="holidays")return json(200,{result:await publicHolidays(p.year,p.country)});
  return json(400,{error:"Choose a supported integration"});
 }catch(e){return json(e.status||503,{error:e.status===400?e.message:e.status===403?e.message:"This service is temporarily unavailable"})}
}
