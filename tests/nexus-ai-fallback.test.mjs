import test from "node:test";
import assert from "node:assert/strict";
import {eligible,retryableError,bounded} from "../netlify/lib/nexus-ai-fallback.mjs";
import {queryWithMeta} from "../netlify/lib/ollama.mjs";
const envKeys=["NEXUS_OPENAI_FALLBACK_ENABLED","OPENAI_API_KEY","NEXUS_OPENAI_MODEL","NEXUS_OLLAMA_URL","NEXUS_OLLAMA_GATEWAY_TOKEN","NEXUS_LIVE_CHAT_ENABLED"];
const withEnvironment=async(changes,fn)=>{
 const snapshot=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
 try{for(const [k,v] of Object.entries(changes))if(v===null)delete process.env[k];else process.env[k]=String(v);return await fn()}
 finally{for(const [k,v] of Object.entries(snapshot))if(v===undefined)delete process.env[k];else process.env[k]=v}
};
const msgs=[{role:"system",content:"Be brief"},{role:"user",content:"Hello"}];
test("openai emergency fallback is disabled unless explicitly enabled and keyed",async()=>{
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"false",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini"},()=>{
  assert.equal(eligible({allowFallback:true,tenantKey:"testtenant",originalError:new TypeError("fetch failed")}),false);
 });
});
test("only retriable Ollama failures are permitted",()=>{
 for(const n of [401,403,400,404,422])assert.equal(retryableError(new Error("Ollama gateway status "+n)),false);
 for(const n of [408,429,500,502,503])assert.equal(retryableError(new Error("Ollama gateway status "+n)),true);
 assert.equal(retryableError(Object.assign(new Error("timeout"),{name:"TimeoutError"})),true);
 assert.equal(retryableError(new Error("Ollama model did not provide visible answer")),true);
});
test("provider must have signed-in caller scope and configured consent",async()=>{
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"true",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini"},()=>{
  const originalError=new Error("Ollama gateway status 503");
  assert.equal(eligible({allowFallback:true,tenantKey:"business-1",originalError}),true);
  assert.equal(eligible({allowFallback:false,tenantKey:"business-1",originalError}),false);
  assert.equal(eligible({allowFallback:true,tenantKey:"",originalError}),false);
  assert.equal(eligible({allowFallback:true,tenantKey:"business-1",originalError:new Error("Ollama gateway status 401")}),false);
 });
});
test("budget and token controls refuse invalid oversized values",()=>{
 assert.equal(bounded(1000,50,1,500),50);
 assert.equal(bounded(-1,50,1,500),50);
 assert.equal(bounded(20,50,1,500),20);
});
test("successful Ollama response never contacts OpenAI",async()=>{
 const originalFetch=globalThis.fetch;
 const called=[];
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"true",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini",NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",NEXUS_LIVE_CHAT_ENABLED:"true"},async()=>{
  try{
   globalThis.fetch=async(url)=>{
    called.push(String(url));
    assert.equal(String(url),"https://gateway.test/api/chat");
    return{ok:true,json:async()=>({message:{content:"From Qwen"}})};
   };
   const answer=await queryWithMeta(msgs,{allowFallback:true,tenantKey:"business-1",maxTokens:100,timeoutMs:20000});
   assert.deepEqual(answer,{text:"From Qwen",source:"ollama"});
   assert.equal(called.length,1);
  }finally{globalThis.fetch=originalFetch}
 });
});
test("gateway authentication error never sends paid OpenAI request",async()=>{
 const originalFetch=globalThis.fetch;
 const called=[];
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"true",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini",NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",NEXUS_LIVE_CHAT_ENABLED:"true"},async()=>{
  try{
   globalThis.fetch=async(url)=>{called.push(String(url));return{ok:false,status:401}};
   await assert.rejects(queryWithMeta(msgs,{allowFallback:true,tenantKey:"business-1",timeoutMs:20000}),/Ollama gateway status 401/);
   assert.deepEqual(called,["https://gateway.test/api/chat"]);
  }finally{globalThis.fetch=originalFetch}
 });
});
