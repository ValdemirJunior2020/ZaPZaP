import{allow,clientIp}from"../lib/abuse.mjs";
import{businessMessages}from"../lib/business-ai.mjs";
import{query as ollamaQuery}from"../lib/ollama.mjs";
import{env,json,str,parse,postOrigin,publishedStore,aiReady,db,entitlement,access}from"../lib/tenant.mjs";
import{widgetEnabled}from"../lib/billing.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function handler(event){
 if(event.httpMethod==="GET")return json(200,{online:aiReady()});
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 if(!aiReady())return json(503,{error:"Live AI is temporarily unavailable. Leave an inquiry for the business."});
 try{
  const req=parse(event,6000),message=str(req.message,700);
  if(!message)return json(400,{error:"Question is required"});
  const c=env();
  if(!await allow(c,"store_chat",clientIp(event),10,60))return json(429,{error:"Too many requests. Try again later"});
  let slug=str(req.slug,50);
  if(req.botId){
   const botId=str(req.botId,80);
   if(!/^bot_[a-z0-9]{20,50}$/.test(botId))return json(404,{error:"Assistant unavailable"});
   const bots=await db(c,"nx_bots?bot_id=eq."+encodeURIComponent(botId)+"&enabled=eq.true&select=store_id");
   const bot=bots?.[0];if(!bot)return json(404,{error:"Assistant unavailable"});
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
  if(req.sessionId&&!uuid.test(req.sessionId))return json(400,{error:"Invalid chat session"});
  const cap=Math.max(5,Math.min(30,Number(store.chat_max_messages)||10));
  const minutes=Math.max(5,Math.min(30,Number(store.chat_max_minutes)||10));
  const claim=await db(c,"rpc/nx_claim_chat_message",{method:"POST",body:{
   p_store_id:store.id,p_session_id:req.sessionId||null,
   p_source_code:str(req.sourceCode,80),p_limit:cap,p_minutes:minutes
  }});
  if(!claim?.allowed)return json(429,{code:"SESSION_LIMIT",limitReached:true,error:"This conversation has ended. Please leave your contact details so the business can follow up."});
  const previous=await db(c,"nx_chat_messages?session_id=eq."+encodeURIComponent(claim.sessionId)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=role,content&order=id.desc&limit=8");
  const history=(previous||[]).reverse().map(x=>({role:x.role,content:x.content}));
  const messages=businessMessages(store,items,message,history);
  // Persist only actual visitor/AI messages, never browser-provided transcripts.
  await db(c,"nx_chat_messages",{method:"POST",body:{session_id:claim.sessionId,store_id:store.id,role:"user",content:message},prefer:"return=minimal"});
  const answer=await ollamaQuery(messages,{maxTokens:450,timeoutMs:50000});
  await db(c,"nx_chat_messages",{method:"POST",body:{session_id:claim.sessionId,store_id:store.id,role:"assistant",content:answer},prefer:"return=minimal"});
  return json(200,{reply:answer,source:"ai",sessionId:claim.sessionId,remaining:claim.remaining,limitReached:claim.remaining===0,expiresAt:claim.expiresAt});
 }catch(e){console.error("Public AI conversation:",e.message);return json(e.status||503,{error:"The business assistant is temporarily unavailable. Please leave an inquiry."})}
}
