import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("Both NexusSales entry pages expose the Personal Assistant sidebar",async()=>{
 for(const path of ["index.html","business.html"]){
  const html=await readFile(path,"utf8");
  assert.match(html,/data-view="personal"/,path);
  assert.match(html,/Build Your Personal Assistant/,path);
 }
});
test("Login visibility does not crash when marketing liveDemo is absent",async()=>{
 const js=await readFile("business.js","utf8");
 const start=js.indexOf("function setVisible("),end=js.indexOf("\nfunction authFields()",start);
 assert.ok(start>=0&&end>start);
 const fn=new Function("$",js.slice(start,end)+";return setVisible");
 const nodes=new Map();
 const $=id=>id==="liveDemo"?null:(nodes.get(id)||nodes.set(id,{classList:{toggle:()=>{}}}).get(id));
 const show=fn($);
 assert.doesNotThrow(()=>show(true));
 assert.doesNotThrow(()=>show(false));
});
