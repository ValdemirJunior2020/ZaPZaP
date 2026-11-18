import{SPECIAL_OWNER,validHandle,personalMessages,styleName}from"../lib/personal-assistant.mjs";
import{JUNIOR_OWNER_ID,JUNIOR_EXPERIENCE,juniorMessages}from"../lib/junior-assistant.mjs";
import{allow,clientIp}from"../lib/abuse.mjs";
import{businessMessages}from"../lib/business-ai.mjs";
import{query as ollamaQuery}from"../lib/ollama.mjs";
import{env,json,str,parse,postOrigin,publishedStore,aiReady,db,entitlement,access}from"../lib/tenant.mjs";
import{widgetEnabled}from"../lib/billing.mjs";
import{recordAiError}from"../lib/ai-diagnostics.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function handler(event){
 if(event.httpMethod==="GET"){
  if(event.queryStringParameters?.assistantHandle){
   try{
    const handle=String(event.queryStringParameters.assistantHandle||"");
    if(!validHandle(handle))return json(404,{error:"Assistant unavailable"});
    const c=env(),rows=await db(c,"nx_personal_assistants?handle=eq."+encodeURIComponent(handle)+"&enabled=eq.true&select=id,owner_id,store_id,display_name,personality,greeting,max_messages");
    const a=rows?.[0];if(!a)return json(404,{error:"Assistant unavailable"});
    const ent=await entitlement(c,a.owner_id);
    if(!access(ent).allowed)return json(404,{error:"Assistant unavailable"});
    return json(200,{online:aiReady(),contactWhatsAppUrl:a.owner_id===SPECIAL_OWNER&&ent.is_complimentary===true?"https://wa.me/15616445874":null,assistant:{name:a.display_name,greeting:a.greeting,style:styleName(a.personality),limit:a.max_messages}});
   }catch(e){console.error("Personal AI public config:",e.message);return json(503,{error:"Assistant temporarily unavailable"})}
  }
  if(event.queryStringParameters?.experience!==JUNIOR_EXPERIENCE)return json(200,{online:aiReady()});
  try{
   const c=env();
   const rows=await db(c,"nx_stores?owner_id=eq."+JUNIOR_OWNER_ID+"&published=eq.true&select=slug,owner_id,chat_max_messages");
   const st=rows?.[0],ent=st?await entitlement(c,st.owner_id):null;
   if(!st||!ent?.is_complimentary||!access(ent).allowed)return json(404,{error:"Assistant unavailable"});
   return json(200,{online:aiReady(),slug:st.slug,limit:Math.max(5,Math.min(30,Number(st.chat_max_messages)||10))});
  }catch(e){console.error("Junior assistant public config:",e.message);return json(503,{error:"Assistant temporarily unavailable"})}
 }
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 if(!aiReady())return json(503,{error:"Live AI is temporarily unavailable. Leave an inquiry for the business."});
 let diagStage="rate_limit",diagOwnerId=null,diagStoreId=null,diagCfg=null;
 const diagStart=Date.now();
 try{
  const req=parse(event,6000),message=str(req.message,700);
  if(!message)return json(400,{error:"Question is required"});
  const c=env();diagCfg=c;
  if(!await allow(c,"store_chat",clientIp(event),10,60))return json(429,{error:"Too many requests. Try again later"});
  const personalMode=req.experience==="personal";diagStage="assistant_lookup";
  let assistant=null;
  if(personalMode){
   if(req.botId||!validHandle(req.assistantHandle))return json(400,{error:"Invalid assistant request"});
   const assistants=await db(c,"nx_personal_assistants?handle=eq."+encodeURIComponent(req.assistantHandle)+"&enabled=eq.true&select=*");
   assistant=assistants?.[0];if(!assistant)return json(404,{error:"Assistant unavailable"});
  }
  const juniorMode=req.experience===JUNIOR_EXPERIENCE;
  let slug=str(req.slug,50);
  if(juniorMode){
   const ownerStores=await db(c,"nx_stores?owner_id=eq."+JUNIOR_OWNER_ID+"&published=eq.true&select=slug");
   if(!ownerStores?.[0])return json(404,{error:"Assistant unavailable"});
   slug=ownerStores[0].slug;
  }
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
  if(!personalMode&&!slug)return json(400,{error:"Business link required"});
  diagStage="store_lookup";
  let store,items,ent;
  if(personalMode){
   const stores=await db(c,"nx_stores?id=eq."+encodeURIComponent(assistant.store_id)+"&owner_id=eq."+encodeURIComponent(assistant.owner_id)+"&select=*");
   store=stores?.[0];if(!store)return json(404,{error:"Assistant unavailable"});
   ent=await entitlement(c,assistant.owner_id);
   if(!access(ent).allowed)return json(403,{error:"Assistant unavailable"});
   items=[];
  }else{
   const published=await publishedStore(c,slug);
   if(!published)return json(404,{error:"Store not available"});
   ({store,items,ent}=published);
  }
  diagOwnerId=store.owner_id;diagStoreId=store.id;
  if(juniorMode&&(store.owner_id!==JUNIOR_OWNER_ID||ent.is_complimentary!==true))return json(403,{error:"This assistant belongs to a different business"});
  diagStage="daily_quota";
  const dailyLimit=ent.is_complimentary===true?1000:ent.subscription_status==="ACTIVE"?1000:100;
  const used=await db(c,"rpc/nx_consume_chat_quota",{method:"POST",body:{p_store_id:store.id,p_cap:dailyLimit}});
  if(used!==true)return json(429,{error:"Assistant message limit reached today"});
  if(req.sessionId&&!uuid.test(req.sessionId))return json(400,{error:"Invalid chat session"});
  const cap=personalMode?assistant.max_messages:Math.max(5,Math.min(30,Number(store.chat_max_messages)||10));
  // Cross-session daily budget; clearing local storage never grants unlimited Ollama use.
  if(!await allow(c,"customer_daily",store.id+":"+clientIp(event),Math.max(30,cap*2),86400))return json(429,{code:"DAILY_LIMIT",limitReached:true,error:"The daily chat limit has been reached. Please leave your phone number or email for the business."});
  const minutes=personalMode?assistant.max_minutes:Math.max(5,Math.min(30,Number(store.chat_max_minutes)||10));
  if(!personalMode&&req.sessionId){
   try{
    const scope=await db(c,"nx_chat_sessions?id=eq."+encodeURIComponent(req.sessionId)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=personal_assistant_id");
    if(scope?.[0]?.personal_assistant_id)return json(400,{error:"Session belongs to a personal assistant"});
   }catch(error){if(!/personal_assistant_id|42703|schema cache/i.test(error.message))throw error}

  }
  diagStage="session_claim";
  const claim=personalMode
    ?await db(c,"rpc/nx_claim_personal_message",{method:"POST",body:{p_assistant:assistant.id,p_session:req.sessionId||null}})
    :await db(c,"rpc/nx_claim_chat_message",{method:"POST",body:{
      p_store_id:store.id,p_session_id:req.sessionId||null,
      p_source_code:str(req.sourceCode,80),p_limit:cap,p_minutes:minutes
    }});
  if(!claim?.allowed)return json(429,{code:"SESSION_LIMIT",limitReached:true,error:"This conversation has ended. Please leave your contact details so the business can follow up."});
  diagStage="history";
  const previous=await db(c,"nx_chat_messages?session_id=eq."+encodeURIComponent(claim.sessionId)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=role,content&order=id.desc&limit=8");
  const history=(previous||[]).reverse().map(x=>({role:x.role,content:x.content}));
  // Resolve QR facts exclusively from this published store; never trust visitor-supplied product details.
  const sourceCode=str(req.sourceCode,80);
  const qrRows=sourceCode?await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&code=eq."+encodeURIComponent(sourceCode)+"&enabled=eq.true&select=id,label,offering_id"):[];
  const qrSource=qrRows?.[0]||null;
  const assigned=qrSource?.id?(await db(c,"nx_employees?store_id=eq."+encodeURIComponent(store.id)+"&qr_source_id=eq."+encodeURIComponent(qrSource.id)+"&enabled=eq.true&select=name,role,language"))?.[0]:null;
  const linkedOffering=qrSource?.offering_id?items.find(item=>item.id===qrSource.offering_id)||null:null;
  const messages=personalMode?personalMessages(assistant,message,history):juniorMode?juniorMessages(message,history):businessMessages(store,items,message,history,qrSource?{label:qrSource.label,offering:linkedOffering}:null);
  if(!personalMode&&!juniorMode){
   try{
    const profile=(await db(c,"nx_business_profiles?store_id=eq."+encodeURIComponent(store.id)+"&select=address,city,region,country,online_only,address_public,timezone,categories,weekly_hours,closed_dates,booking_duration_minutes"))?.[0];
    if(profile){
     const now=new Intl.DateTimeFormat("en-US",{timeZone:profile.timezone,dateStyle:"full",timeStyle:"short"}).format(new Date());
     const publicFacts={timezone:profile.timezone,localBusinessTime:now,weeklyHours:profile.weekly_hours,closedDates:profile.closed_dates,onlineOnly:profile.online_only,categories:profile.categories,
      ...(profile.address_public?{publicAddress:[profile.address,profile.city,profile.region,profile.country].filter(Boolean).join(", ")}:{} )};
     messages[0].content+=" VERIFIED BUSINESS OPERATING PROFILE: "+JSON.stringify(publicFacts).slice(0,3500)+". Use this timezone and opening hours for questions. The scheduling form can check a customer-proposed time for conflicts; it does NOT confirm a booking. Invite the visitor to submit the appointment request and do not invent available times.";
    }
   }catch(e){console.warn("Business-hours context unavailable:",e.message)}
  }
  if(assigned)messages[0].content+=" Assigned sales employee (not the owner): "+JSON.stringify(assigned)+". Reply in the visitor language, or the employee language if unclear. Do not claim to place calls.";
  // Persist only actual visitor/AI messages, never browser-provided transcripts.
  diagStage="message_save";
  await db(c,"nx_chat_messages",{method:"POST",body:{session_id:claim.sessionId,store_id:store.id,role:"user",content:message},prefer:"return=minimal"});
  diagStage="ai_gateway";
  const answer=await ollamaQuery(messages,{maxTokens:450,timeoutMs:50000});
  diagStage="reply_save";
  await db(c,"nx_chat_messages",{method:"POST",body:{session_id:claim.sessionId,store_id:store.id,role:"assistant",content:answer},prefer:"return=minimal"});
  return json(200,{reply:answer,source:"ai",sessionId:claim.sessionId,remaining:claim.remaining,limitReached:claim.remaining===0,expiresAt:claim.expiresAt});
 }catch(e){
  const diag=await recordAiError(diagCfg||env(),{ownerId:diagOwnerId,storeId:diagStoreId,stage:diagStage,error:e,elapsedMs:Date.now()-diagStart});
  return json(e.status||503,{error:"The business assistant is temporarily unavailable. Please leave an inquiry.",reference:diag.id});
 }
}
