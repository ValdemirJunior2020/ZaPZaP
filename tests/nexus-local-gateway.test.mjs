import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";

test("Private gateway starts on loopback and blocks unauthorized model requests",async()=>{
 const port=18789;
 const token="test-only-gateway-token-32-characters";
 const proc=spawn(process.execPath,["scripts/nexus-ollama-gateway.mjs"],{
  cwd:process.cwd(),
  env:{...process.env,NEXUS_LOCAL_GATEWAY_PORT:String(port),NEXUS_OLLAMA_GATEWAY_TOKEN:token},
  stdio:["ignore","pipe","pipe"]
 });
 let logs="";
 proc.stderr.on("data",c=>{logs+=c.toString()});
 try {
  let started=false;
  for(let i=0;i<50;i++){
   if(proc.exitCode!==null)break;
   try{const r=await fetch("http://127.0.0.1:"+port+"/health",{signal:AbortSignal.timeout(300)});if(r.status===200){started=true;break}}catch{}
   await new Promise(resolve=>setTimeout(resolve,80));
  }
  assert.equal(started,true,"Gateway must launch on test port: "+logs.slice(0,200));
  const url="http://127.0.0.1:"+port+"/api/chat";
  const unauth=await fetch(url,{method:"POST",body:"{}",headers:{"Content-Type":"application/json"}});
  assert.equal(unauth.status,401);
  const badToken=await fetch(url,{method:"POST",body:"{}",headers:{"Content-Type":"application/json",Authorization:"Bearer wrong-secret"}});
  assert.equal(badToken.status,401);
  const malformed=await fetch(url,{method:"POST",body:JSON.stringify({model:"unknown",messages:[{role:"user",content:"hello"}]}),headers:{"Content-Type":"application/json",Authorization:"Bearer "+token}});
  assert.equal(malformed.status,400);
  const missing=await fetch("http://127.0.0.1:"+port+"/api/tags");
  assert.equal(missing.status,404,"Gateway must not expose raw Ollama routes");
 }finally{
  proc.kill();
  if(proc.exitCode===null)await Promise.race([once(proc,"exit"),new Promise(resolve=>setTimeout(resolve,1200))]);
 }
});
