import{allow,clientIp}from"../lib/abuse.mjs";
import{businessMessages}from"../lib/business-ai.mjs";
import{query as ollamaQuery}from"../lib/ollama.mjs";
import{env,json,str,parse,postOrigin,publishedStore,aiReady,db,entitlement,access}from "../lib/tenant.mjs";
import{widgetEnabled}from"../lib/billing.mjs";
export async function handler(event){
 if(event.httpMethod==="GET")return json(200,{online:aiReady()});
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 if(!aiReady())return json(503,{error:"Live AI is not yet available"});
 try{
  const req=parse(event,12500),message=str(req.message,700);
  if(!message)return json(400,{error:"Question is required"});
  const c=env();
  if(!await allow(c,"store_chat",clientIp(event),10,60))return json(429,{error:"Too many requests. Try again later"});
  let slug=str(req.slug,50);
  if(req.botId){
   const botId=str(req.botId,80);
   if(!/^bot_[a-z0-9]{20,50}$/.test(botId))return json(404,{error:"Assistant unavailable"});
   const rows=await db(c,"nx_bots?bot_id=eq."+encodeURIComponent(botId)+"&enabled=eq.true&select=store_id");
   const bot=rows?.[0];if(!bot)return json(404,{error:"Assistant unavailable"});
   const linked=await db(c,"nx_stores?id=eq."+encodeURIComponent(bot.store_id)+"&published=eq.true&select=slug,owner_id");
   const st=linked?.[0];if(!st)return json(404,{error:"Assistant unavailable"});
   const sub=await entitlement(c,st.owner_id);
   if(!access(sub).allowed||!widgetEnabled(c,sub))return json(403,{error:"Website assistant requires an active subscription"});
   slug=st.slug;
  }
  if(!slug)return json(400,{error:"Business link required"});
  const published=await publishedStore(c,slug);
  if(!published)return json(404,{error:"Store not available"});
  const {store,items,ent}=published;
  const dailyLimit=ent.is_complimentary===true?1000:ent.subscription_status==="ACTIVE"?1000:100;
  const used=await db(c,"rpc/nx_consume_chat_quota",{method:"POST",body:{p_store_id:store.id,p_cap:dailyLimit}});
  if(used!==true)return json(429,{error:"Assistant message limit reached today"});
  const messages=businessMessages(store,items,message,req.history);
  const answer=await ollamaQuery(messages,{maxTokens:450,timeoutMs:75000});
  return json(200,{reply:answer,source:"ai"});
 }catch(e){console.error("Public AI conversation:",e.message);return json(e.status||503,{error:"The business assistant is temporarily unavailable"})}
}