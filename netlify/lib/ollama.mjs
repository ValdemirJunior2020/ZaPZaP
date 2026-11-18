import{fallback as openaiFallback,isConfigured as openaiConfigured,retryableError as localRetryable}from"./nexus-ai-fallback.mjs";
// Private Ollama transport for NexusSales public and trial conversations.
// Only a server-defined HTTPS gateway is accepted; never use a customer-controlled URL.
function config(){
 const raw=(process.env.NEXUS_OLLAMA_URL||"").trim();
 const token=process.env.NEXUS_OLLAMA_GATEWAY_TOKEN||"";
 if(!raw||!token)return null;
 let url;try{url=new URL(raw)}catch{return null}
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||!url.hostname||url.pathname!=="/")return null;
 return{base:url.origin,token,model:process.env.NEXUS_OLLAMA_MODEL||"qwen3:8b"};
}
function readiness(){
 const enabled=String(process.env.NEXUS_LIVE_CHAT_ENABLED||"").trim().toLowerCase()==="true";
 const raw=String(process.env.NEXUS_OLLAMA_URL||"").trim();
 const token=String(process.env.NEXUS_OLLAMA_GATEWAY_TOKEN||"");
 if(!enabled)return{ready:false,code:"CHAT_DISABLED"};
 if(!raw)return{ready:false,code:"GATEWAY_URL_MISSING"};
 let url;try{url=new URL(raw)}catch{return{ready:false,code:"GATEWAY_URL_INVALID"}}
 if(url.protocol!=="https:"||url.username||url.password||url.search||url.hash||!url.hostname||url.pathname!=="/")return{ready:false,code:"GATEWAY_URL_INVALID"};
 if(!token)return{ready:false,code:"GATEWAY_TOKEN_MISSING"};
 return{ready:true,code:"READY"};
}
function r// Primary local model -> lighter local model -> optional paid OpenAI.
// Both local attempts always use the same private authenticated HTTPS gateway.
function secondaryModel(){
 const enabled=String(process.env.NEXUS_OLLAMA_SECONDARY_ENABLED??"true").toLowerCase()==="true";
 const model=String(process.env.NEXUS_OLLAMA_SECONDARY_MODEL||"qwen3:4b").trim();
 return enabled&&/^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,70}$/.test(model)?model:null;
}
function localTimeouts(timeoutMs,hasSecondary,hasOpenAI){
 const total=Math.max(5000,Math.min(90000,Number(timeoutMs)||75000));
 if(!hasSecondary)return{primary:hasOpenAI?Math.max(3000,Math.floor(total*0.68)):total,secondary:0};
 const reserveOpenAI=hasOpenAI?Math.min(11500,Math.floor(total*0.28)):0;
 const localBudget=total-reserveOpenAI;
 return {primary:Math.max(3000,Math.floor(localBudget*0.65)),secondary:Math.max(1800,localBudget-Math.floor(localBudget*0.65)-600)};
}
async function localChat(c,messages,{model,maxTokens,timeoutMs}){
 const r=await fetch(c.base+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+c.token},
  body:JSON.stringify({model,messages,stream:false,think:false,options:{temperature:0.25,num_predict:maxTokens}}),
  signal:AbortSignal.timeout(timeoutMs)});
 if(!r.ok)throw Error("Ollama gateway status "+r.status);
 const j=await r.json();
 const answer=String(j?.message?.content||"").trim();
 if(!answer)throw Error("Ollama model did not provide visible answer");
 return answer.slice(0,2500);
}
async function queryWithMeta(messages,{maxTokens=380,timeoutMs=75000,allowFallback=false,tenantKey=null}={}){
 const c=config(),hasOpenAI=allowFallback===true&&openaiConfigured()&&typeof tenantKey==="string";
 const secondary=c?secondaryModel():null;
 const fallbackModel=secondary&&secondary!==c.model?secondary:null;
 const durations=localTimeouts(timeoutMs,Boolean(fallbackModel),hasOpenAI);
 let error;
 try{
  if(!c)throw Error("Ollama gateway not configured");
  return{text:await localChat(c,messages,{model:c.model,maxTokens,timeoutMs:durations.primary}),source:"ollama"};
 }catch(e){error=e}
 // Client/auth failures must never silently fail over to another provider.
 if(fallbackModel&&localRetryable(error)){
  try{return{text:await localChat(c,messages,{model:fallbackModel,maxTokens,timeoutMs:durations.secondary}),source:"ollama-lite"}}
  catch(e){error=e}
 }
 if(!hasOpenAI)throw error;
 return openaiFallback(messages,{allowFallback:true,tenantKey,originalError:error,maxTokens,
  timeoutMs:Math.max(1800,Math.min(16000,Number(timeoutMs)-durations.primary-durations.secondary-700))});
}timeoutMs:fallbackTimeout});
 }
}
async function query(messages,options={}){
 const result=await queryWithMeta(messages,options);
 return result.text;
}
async function verify(){if(!ready())return false;try{return Boolean(await query([{role:"user",content:"Reply with exactly OK."}],{maxTokens:30,timeoutMs:18000}))}catch(e){console.error("Ollama readiness:",e.message);return false}}
export{ready,readiness,verify,query,queryWithMeta,secondaryModel,localTimeouts};
