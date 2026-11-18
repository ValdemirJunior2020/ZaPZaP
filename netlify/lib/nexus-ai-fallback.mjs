// Optional OpenAI emergency fallback for NexusSales.
// Default OFF. Only used after Ollama fails and the caller explicitly opts into fallback.
// Uses existing durable Supabase abuse budgets (fail closed) across all serverless instances.
// Never logs prompts, customer data, API credentials, or responses.
import {allow} from "./abuse.mjs";
import {env} from "./billing.mjs";

const enabled=()=>process.env.NEXUS_OPENAI_FALLBACK_ENABLED==="true";
const isConfigured=()=>enabled() && /^sk-/.test(process.env.OPENAI_API_KEY||"") && /^[a-zA-Z0-9][a-zA-Z0-9._-]{1,70}$/.test(process.env.NEXUS_OPENAI_MODEL||"gpt-4.1-mini");
const bounded=(value,fallback,low,high)=>{
 const n=Number(value);return Number.isSafeInteger(n)&&n>=low&&n<=high?n:fallback;
};
const retryableError=err=>{
 const message=String(err?.message||"");
 if(err?.name==="TimeoutError"||err?.name==="AbortError")return true;
 if(err instanceof TypeError||/fetch failed|ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT/i.test(message))return true;
 const status=Number(message.match(/^Ollama gateway status (\d{3})/)?.[1]);
 return status===408||status===429||status>=500;
};
function eligible({allowFallback=false,tenantKey,originalError}={}){
 return allowFallback===true && typeof tenantKey==="string" && /^[a-zA-Z0-9_-]{3,100}$/.test(tenantKey)
  && isConfigured() && retryableError(originalError);
}
async function fallback(messages,{allowFallback=false,tenantKey,originalError,maxTokens=250,timeoutMs=12000}={}){
 if(!eligible({allowFallback,tenantKey,originalError}))throw originalError;
 // In addition to the existing per-visitor daily quotas:
 // - All tenants together: at most 50 emergency API calls/day by default.
 // - Each individual tenant: at most 10 calls/day by default.
 // - Each tenant per minute: at most 2 calls.
 // The counters use the existing shared DB-backed atomic limiter. Failure is a hard deny.
 const globalCap=bounded(process.env.NEXUS_OPENAI_DAILY_MAX_CALLS,50,1,500);
 const tenantCap=bounded(process.env.NEXUS_OPENAI_TENANT_DAILY_MAX_CALLS,10,1,100);
 const c=env();
 const approved=await allow(c,"openai_fallback_global_v1","nexus-all-tenants",globalCap,86400);
 if(!approved)throw Object.assign(new Error("Emergency AI daily quota reached"),{status:503,code:"OPENAI_FALLBACK_DAILY_LIMIT"});
 const tenantApproved=await allow(c,"openai_fallback_tenant_v1",tenantKey,tenantCap,86400);
 if(!tenantApproved)throw Object.assign(new Error("Emergency AI tenant quota reached"),{status:503,code:"OPENAI_FALLBACK_TENANT_LIMIT"});
 const minuteApproved=await allow(c,"openai_fallback_tenant_min_v1",tenantKey,2,60);
 if(!minuteApproved)throw Object.assign(new Error("Emergency AI rate limit"),{status:503,code:"OPENAI_FALLBACK_RATE_LIMIT"});
 const apiKey=process.env.OPENAI_API_KEY;
 const model=process.env.NEXUS_OPENAI_MODEL||"gpt-4.1-mini";
 const safeMessages=(Array.isArray(messages)?messages:[]).slice(-12).filter(m=>["system","user","assistant"].includes(m?.role))
  .map(m=>({role:m.role,content:String(m.content||"").slice(0,12000)}));
 if(!safeMessages.some(m=>m.role==="user"))throw originalError;
 const requested=Math.max(50,Math.min(450,Math.floor(Number(maxTokens)||250)));
 const limit=Math.min(requested,bounded(process.env.NEXUS_OPENAI_MAX_OUTPUT_TOKENS,250,50,450));
 const timer=Math.max(1000,Math.min(18000,Number(timeoutMs)||12000));
 // NO automatic retries: each model call may be billable even when a network error is reported.
 const res=await fetch("https://api.openai.com/v1/chat/completions",{
  method:"POST",headers:{"Authorization":"Bearer "+apiKey,"Content-Type":"application/json"},
  body:JSON.stringify({model,messages:safeMessages,max_completion_tokens:limit,stream:false}),
  signal:AbortSignal.timeout(timer)
 });
 if(!res.ok)throw Object.assign(new Error("Emergency AI service unavailable"),{status:503,code:"OPENAI_FALLBACK_PROVIDER_ERROR"});
 const result=await res.json();
 const answer=String(result?.choices?.[0]?.message?.content||"").trim();
 if(!answer)throw Object.assign(new Error("Emergency AI empty response"),{status:503,code:"OPENAI_FALLBACK_EMPTY"});
 console.info("NEXUS_AI_FAILOVER",{provider:"openai",model,tenant:tenantKey?"scoped":"missing",tokens:result?.usage?.total_tokens??null});
 return {text:answer.slice(0,2500),source:"openai"};
}
export{eligible,fallback,enabled,isConfigured,retryableError,bounded};
