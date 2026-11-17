import{env,json,parse,postOrigin}from"../lib/tenant.mjs";
import{allow,clientIp}from"../lib/abuse.mjs";
import{businessMessages}from"../lib/business-ai.mjs";
import{ready,query}from"../lib/ollama.mjs";
import{businessFor}from"../lib/demo-businesses.mjs";

// Real Qwen3 inference over deliberately fictional server-side data.
// Demo use is independent of customer subscriptions, store IDs, and 48-hour trials.
export async function handler(event){
 if(event.httpMethod==="GET")return json(200,{configured:ready(),connectionVerified:false,businesses:["auto","beauty","hvac"],fictional:true});
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 if(!ready())return json(503,{error:"Our live demonstration assistant is temporarily offline. Please try again later."});
 try{
  const raw=event.body||"";
  if(raw.length>4800)return json(413,{error:"Question is too long"});
  const input=parse(event,4800);
  const id=typeof input.business==="string"?input.business:"";
  const selected=businessFor(id);
  if(!selected)return json(400,{error:"Choose a demonstration business"});
  const question=typeof input.message==="string"?input.message.trim():"";
  if(!question||question.length>350)return json(400,{error:"Enter a question up to 350 characters"});
  // Fail closed if the cross-instance abuse database is unavailable.
  const c=env(),ip=clientIp(event);
  if(!await allow(c,"demo_global","all_visitors",250,86400))return json(429,{error:"The public demonstration has reached today's capacity. Please try tomorrow."});
  if(!await allow(c,"demo_daily",ip,6,86400))return json(429,{error:"You've reached today's six free demo questions. Create an account to build your own assistant."});
  if(!await allow(c,"demo_minute",ip,3,60))return json(429,{error:"A little too fast! Please try again in a minute."});
  const history=Array.isArray(input.history)?input.history.slice(-6):[];
  const messages=businessMessages(selected.store,selected.items,question,history);
  const reply=await query(messages,{maxTokens:220,timeoutMs:19500});
  return json(200,{reply,source:"ollama",fictional:true,business:id});
 }catch(err){
  const message=String(err?.message||"");
  const auth=/Ollama gateway status (401|403)/.test(message);
  const route=/Ollama gateway status (404|502|503|521|522|523|530)/.test(message);
  const timeout=err?.name==="TimeoutError"||err?.name==="AbortError"||/timeout/i.test(message);
  const network=err instanceof TypeError||/fetch failed|ENOTFOUND|EAI_AGAIN|ECONNREFUSED/.test(message);
  const code=auth?"GATEWAY_AUTH":route?"GATEWAY_ROUTE":network?"GATEWAY_NETWORK":timeout?"GATEWAY_TIMEOUT":"AI_UNAVAILABLE";
  console.error("Public demo chat failed:",code,message.slice(0,200));
  const status=code==="GATEWAY_AUTH"?502:503;
  return json(status,{code,error:auth?"AI gateway authentication failed. The server gateway token may not match.":route||network?"The AI gateway could not be reached. Check the Cloudflare DNS route and tunnel.":timeout?"The AI model did not respond in time. Keep Ollama running and try again.":"The live Qwen3 demo is temporarily unavailable."});
 }
}
