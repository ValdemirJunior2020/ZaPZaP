import{fallback as openaiFallback,isConfigured as openaiConfigured}from"./nexus-ai-fallback.mjs";
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
function ready(){return readiness().ready}
async function queryWithMeta(messages,{maxTokens=380,timeoutMs=75000,allowFallback=false,tenantKey=null}={}){
 const c=config();
 const mayFallback=allowFallback===true&&openaiConfigured()&&typeof tenantKey==="string";
 const primaryTimeout=mayFallback?Math.min(24000,Math.max(3500,timeoutMs-16000)):timeoutMs;
 try{
  if(!c)throw Error("Ollama gateway not configured");
  const r=await fetch(c.base+"/api/chat",{method:"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+c.token},
   body:JSON.stringify({model:c.model,messages,stream:false,think:false,options:{temperature:0.25,num_predict:maxTokens}}),signal:AbortSignal.timeout(primaryTimeout)});
  if(!r.ok)throw Error("Ollama gateway status "+r.status);
  const j=await r.json();
  const answer=String(j?.message?.content||"").trim();
  if(!answer)throw Error("Ollama model did not provide visible answer");
  return{text:answer.slice(0,2500),source:"ollama"};
 }catch(error){
  if(!mayFallback)throw error;
  const fallbackTimeout=Math.max(1000,Math.min(16000,timeoutMs-primaryTimeout-500));
  return openaiFallback(messages,{allowFallback:true,tenantKey,originalError:error,maxTokens,timeoutMs:fallbackTimeout});
 }
}
async function query(messages,options={}){
 const result=await queryWithMeta(messages,options);
 return result.text;
}
async function verify(){if(!ready())return false;try{return Boolean(await query([{role:"user",content:"Reply with exactly OK."}],{maxTokens:30,timeoutMs:18000}))}catch(e){console.error("Ollama readiness:",e.message);return false}}
export{ready,readiness,verify,query,queryWithMeta};
