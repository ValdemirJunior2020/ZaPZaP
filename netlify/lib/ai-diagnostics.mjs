import crypto from "node:crypto";
import{db}from"./billing.mjs";
// Privacy-safe operational diagnostics: never persist text, IPs, tokens, prompts, or raw exceptions.
const safeStages=new Set(["rate_limit","assistant_lookup","store_lookup","daily_quota","session_claim","history","message_save","ai_gateway","reply_save","other"]);
function stageName(value){return safeStages.has(value)?value:"other"}
function errorKind(error,stage){
 const msg=String(error?.message||"");
 if(/Durable abuse protection not configured/.test(msg))return"ABUSE_SECRET_MISSING";
 if(/Ollama gateway not configured/.test(msg))return"AI_CONFIG_MISSING";
 if(/Ollama gateway status 401/.test(msg))return"GATEWAY_UNAUTHORIZED";
 if(/Ollama gateway status 429/.test(msg))return"GATEWAY_RATE_LIMIT";
 if(/Ollama gateway status 5\d\d/.test(msg))return"GATEWAY_ERROR";
 if(/Ollama gateway status 4\d\d/.test(msg))return"GATEWAY_REJECTED";
 if(/Ollama model did not provide visible answer/.test(msg))return"EMPTY_AI_REPLY";
 if(error?.name==="TimeoutError"||error?.name==="AbortError"||/timeout|ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT/i.test(msg))return"AI_TIMEOUT";
 if(stage==="ai_gateway")return"AI_CONNECTION_FAILED";
 if(/Database operation failed/.test(msg))return"DATABASE_ERROR";
 return"REQUEST_FAILED";
}
async function recordAiError(cfg,{ownerId,storeId,stage,error,elapsedMs}){
 const id=crypto.randomUUID();
 const code=errorKind(error,stage),safeStage=stageName(stage);
 console.error("AI_DIAGNOSTIC",JSON.stringify({id,code,stage:safeStage,elapsed_ms:Math.min(120000,Math.max(0,Math.round(elapsedMs||0)))}));
 if(ownerId&&storeId){
  try{
   await db(cfg,"nx_ai_error_logs",{method:"POST",body:{id,owner_id:ownerId,store_id:storeId,stage:safeStage,error_code:code,elapsed_ms:Math.min(120000,Math.max(0,Math.round(elapsedMs||0)))},prefer:"return=minimal"});
  }catch{console.warn("AI_DIAGNOSTIC_DB_WRITE_FAILED",id)}
 }
 return{id,code};
}
export{recordAiError,errorKind,stageName};
