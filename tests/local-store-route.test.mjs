import test from "node:test";
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {once} from "node:events";
import net from "node:net";

test("local server serves public SmartStore at /s/:slug without redirecting to /store.html",async()=>{
 const server=net.createServer();server.listen(0,"127.0.0.1");await once(server,"listening");const port=server.address().port;server.close();await once(server,"close");
 const child=spawn(process.execPath,["server.mjs"],{cwd:new URL("../",import.meta.url),env:{...process.env,PORT:String(port),HOST:"127.0.0.1"},stdio:["ignore","pipe","pipe"]});
 try{
  let response;
  for(let i=0;i<30;i++){try{response=await fetch("http://127.0.0.1:"+port+"/s/junior");break}catch{await new Promise(resolve=>setTimeout(resolve,100))}}
  assert.ok(response,"local HTTP server should start");
  assert.equal(response.status,200);
  assert.equal(response.headers.get("x-nexus-local-store"),"v2");
  assert.match(response.headers.get("content-type")||"","text/html");
  const html=await response.text();
  assert.match(html,/id="introToggle"/);
  assert.match(html,/src="\/store-live\.js"/);
  const missing=await fetch("http://127.0.0.1:"+port+"/s/invalid-tenant-name/extra");
  assert.equal(missing.status,404);
 }finally{
  child.kill();
  await new Promise(resolve=>{if(child.exitCode!==null||child.signalCode!==null)resolve();else child.once("exit",resolve)});
 }
});
