import{env,db,json,str,entitlement,access,aiReady}from "../lib/tenant.mjs";
import{widgetEnabled}from "../lib/billing.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const botId=str(event.queryStringParameters?.botId,80);
 if(!/^bot_[a-z0-9]{20,50}$/.test(botId))return json(404,{available:false});
 try{
  const c=env();
  const bots=await db(c,"nx_bots?bot_id=eq."+encodeURIComponent(botId)+"&enabled=eq.true&select=bot_id,store_id,greeting");
  const bot=bots?.[0];if(!bot)return json(404,{available:false});
  const stores=await db(c,"nx_stores?id=eq."+encodeURIComponent(bot.store_id)+"&published=eq.true&select=id,owner_id,slug,name");
  const store=stores?.[0];if(!store)return json(404,{available:false});
  const ent=await entitlement(c,store.owner_id);
  if(!access(ent).allowed||!widgetEnabled(c,ent)||!aiReady())return json(403,{available:false});
  return json(200,{available:true,botId:bot.bot_id,slug:store.slug,businessName:store.name,greeting:bot.greeting});
 }catch(e){console.error("Widget status:",e.message);return json(503,{available:false})}
}