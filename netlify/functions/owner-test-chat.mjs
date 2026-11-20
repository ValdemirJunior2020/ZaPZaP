import {publicSalesContact,needsPublicPhone,verifiedSalesAnswer,verifiedSalesInstructions} from "../lib/verified-sales-routing.mjs";
import {env,json,userFrom,ownStore,offerings,postOrigin,parse,aiReady,access} from "../lib/tenant.mjs";
import {allow,clientIp} from "../lib/abuse.mjs";
import {businessMessages} from "../lib/business-ai.mjs";
import {queryWithMeta as aiQuery,readiness} from "../lib/ollama.mjs";

// Owner-only sandbox. The business and catalog are ALWAYS loaded using
// the authenticated Supabase user. Testing never writes trial or publish state.
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 try{
  const input=parse(event,7000);
  const message=typeof input.message==="string"?input.message.trim():"";
  if(message.length<1||message.length>500)return json(400,{error:"Enter a question (up to 500 characters)."});
  const c=env();
  const {user,ent}=await userFrom(event,c);
  if(!ent)return json(403,{error:"Business account not initialized."});
  if(!ent.is_complimentary&&ent.trial_started_at&&!access(ent).allowed)return json(402,{error:"Your trial has ended. Subscription required to continue testing."});
  const store=await ownStore(c,user.id);
  if(!store)return json(400,{error:"Save your business details first."});
  const items=await offerings(c,store.id);
  // Owner preview can test business knowledge before adding offerings.
  // Missing catalog entries never authorize invented prices or availability.
  // Public storefront publishing rules remain unchanged.
  if(!aiReady())return json(503,{code:readiness().code,error:"The AI gateway is not configured or is offline. Your trial has not started."});
  // Database-backed, cross-instance budgets. No client-provided tenant ID.
  if(!await allow(c,"owner_test_global","all",500,86400))return json(429,{error:"Testing capacity reached for today."});
  if(!await allow(c,"owner_test_daily",user.id,20,86400))return json(429,{error:"You've used your 20 test questions for today."});
  if(!await allow(c,"owner_test_minute",user.id,4,60))return json(429,{error:"Please wait a minute before testing again."});
  if(!await allow(c,"owner_test_ip",clientIp(event),20,60))return json(429,{error:"Too many requests from this connection."});
  const contactPhone=needsPublicPhone(message)?await publicSalesContact(c,store):null;
  const grounded=verifiedSalesAnswer(message,contactPhone);
  if(grounded)return json(200,{reply:grounded,source:"verified_business",trialStarted:false,published:store.published});
  const history=Array.isArray(input.history)?input.history.slice(-6):[];
  const messages=businessMessages(store,items,message,history);
  messages[0].content+=verifiedSalesInstructions(contactPhone);
  const result=await aiQuery(messages,{maxTokens:350,timeoutMs:22000,allowFallback:true,tenantKey:store.id});
  return json(200,{reply:result.text,source:result.source,trialStarted:false,published:store.published});
 }catch(error){
  console.error("Owner private AI test failed:",String(error?.message||error).slice(0,160));
  const code=error?.status||503;
  const detail=String(error?.message||"");
  if(/^Ollama gateway status (401|403)$/.test(detail))return json(502,{code:"GATEWAY_AUTH",error:"Ollama gateway rejected the token. Netlify's gateway token must match your local gateway token."});
  if(/^Ollama gateway status (404|502|503|521|522|523|530)$/.test(detail))return json(503,{code:"GATEWAY_ROUTE",error:"Cloudflare is not reaching the local Ollama gateway. Check the tunnel route."});
  if(error?.name==="TimeoutError"||error?.name==="AbortError")return json(503,{code:"GATEWAY_TIMEOUT",error:"Ollama did not finish replying in time. Your test does not start a trial."});
  if(error instanceof TypeError||/fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN/i.test(detail))return json(503,{code:"GATEWAY_NETWORK",error:"Netlify cannot connect to the Cloudflare Ollama gateway."});
  return json(code,{code:"TEST_UNAVAILABLE",error:code===401?"Please sign in again.":code===400?"Invalid request.":code===403?"Access denied.":"The AI test is currently unavailable. Your access and trial remain unchanged."});
 }
}
