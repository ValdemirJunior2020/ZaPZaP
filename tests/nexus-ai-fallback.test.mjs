import test from "node:test";
import assert from "node:assert/strict";
import {eligible,retryableError,bounded} from "../netlify/lib/nexus-ai-fallback.mjs";
import {queryWithMeta,localTimeouts} from "../netlify/lib/ollama.mjs";
const envKeys=["NEXUS_OPENAI_FALLBACK_ENABLED","OPENAI_API_KEY","NEXUS_OPENAI_MODEL","NEXUS_OLLAMA_URL","NEXUS_OLLAMA_GATEWAY_TOKEN","NEXUS_LIVE_CHAT_ENABLED","NEXUS_OLLAMA_SECONDARY_ENABLED","NEXUS_OLLAMA_SECONDARY_MODEL"];
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
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"true",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini",NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",NEXUS_LIVE_CHAT_ENABLED:"true",NEXUS_OLLAMA_SECONDARY_ENABLED:"false"},async()=>{
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
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"true",OPENAI_API_KEY:"sk-test",NEXUS_OPENAI_MODEL:"gpt-4.1-mini",NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",NEXUS_LIVE_CHAT_ENABLED:"true",NEXUS_OLLAMA_SECONDARY_ENABLED:"false"},async()=>{
  try{
   globalThis.fetch=async(url)=>{called.push(String(url));return{ok:false,status:401}};
   await assert.rejects(queryWithMeta(msgs,{allowFallback:true,tenantKey:"business-1",timeoutMs:20000}),/Ollama gateway status 401/);
   assert.deepEqual(called,["https://gateway.test/api/chat"]);
  }finally{globalThis.fetch=originalFetch}
 });
});

test("timeout allocation preserves time budget for three AI tiers",()=>{
 const d=localTimeouts(50000,true,true);
 assert.ok(d.primary>=14000);
 assert.ok(d.secondary>=6000);
 assert.ok(d.primary+d.secondary+700<50000);
});
test("Qwen 4b takes over when Qwen 8b returns gateway 503",async()=>{
 const previousFetch=globalThis.fetch;
 const models=[];
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"false",OPENAI_API_KEY:null,
  NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",NEXUS_OLLAMA_MODEL:"qwen3:8b",
  NEXUS_OLLAMA_SECONDARY_ENABLED:"true",NEXUS_OLLAMA_SECONDARY_MODEL:"qwen3:4b"},async()=>{
  try{
   globalThis.fetch=async(_url,init)=>{
    const body=JSON.parse(init.body);
    models.push(body.model);
    return body.model==="qwen3:8b"?{ok:false,status:503}:{ok:true,json:async()=>({message:{content:"Local backup works"}})};
   };
   const answer=await queryWithMeta(msgs,{allowFallback:true,tenantKey:"business-1",maxTokens:100,timeoutMs:50000});
   assert.deepEqual(answer,{text:"Local backup works",source:"ollama-lite"});
   assert.deepEqual(models,["qwen3:8b","qwen3:4b"]);
  }finally{globalThis.fetch=previousFetch}
 });
});
test("Qwen 4b never bypasses authentication error from Qwen 8b",async()=>{
 const prev=globalThis.fetch;
 const models=[];
 await withEnvironment({NEXUS_OPENAI_FALLBACK_ENABLED:"false",OPENAI_API_KEY:null,
  NEXUS_OLLAMA_URL:"https://gateway.test/",NEXUS_OLLAMA_GATEWAY_TOKEN:"secret",
  NEXUS_OLLAMA_SECONDARY_ENABLED:"true",NEXUS_OLLAMA_SECONDARY_MODEL:"qwen3:4b"},async()=>{
  try{
   globalThis.fetch=async(_url,init)=>{models.push(JSON.parse(init.body).model);return{ok:false,status:401}};
   await assert.rejects(queryWithMeta(msgs,{allowFallback:false,tenantKey:"business-1",timeoutMs:50000}),/gateway status 401/);
   assert.deepEqual(models,["qwen3:8b"]);
  }finally{globalThis.fetch=prev}
 });
});
