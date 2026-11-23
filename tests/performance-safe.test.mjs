import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {performance} from "node:perf_hooks";

const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");

test("public store loading skeleton is responsive and clears on success or error",async()=>{
 const [html,js]=await Promise.all([read("store.html"),read("store-live.js")]);
 assert.match(html,/id="storeLoadingSkeleton"/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(html,/skeleton-layout/);
 assert.match(js,/showFailure=text=>\{[^\n]*storeLoadingSkeleton/);
 assert.match(js,/storeLoadingSkeleton"\)\?\.classList\.add\("hidden"\)/);
});

test("offscreen product images load lazily with intrinsic dimensions",async()=>{
 const [owner,store]=await Promise.all([read("business.js"),read("store-live.js")]);
 assert.match(owner,/loading="lazy" decoding="async" width="320" height="145"/);
 assert.match(store,/loading="lazy" decoding="async" width="320" height="153"/);
});

test("public read requests time out without changing customer chat or payment requests",async()=>{
 const [store,widget]=await Promise.all([read("store-live.js"),read("widget-chat.html")]);
 assert.match(store,/public-store\?slug=[^\n]*AbortSignal\.timeout\(12000\)/);
 assert.match(widget,/widget-config\?botId=[^\n]*AbortSignal\.timeout\(12000\)/);
 assert.match(store,/fetch\("\/\.netlify\/functions\/store-chat"/);
 assert.match(widget,/fetch\("\/\.netlify\/functions\/store-chat"/);
});

test("authenticated workspace performs independent read-only queries concurrently",async()=>{
 const source=await read("netlify/functions/owner-workspace.mjs");
 assert.match(source,/const \[profile,items,initialLeads,qrSources,employees,appointments\]=await Promise\.all\(\[/);
 assert.match(source,/let leads=initialLeads/);
 assert.match(source,/personalSchemaReady/);
 assert.match(source,/teamEntitled\(user,ent\)/);
});

test("team member counts and QR lookup are indexed once, with matching results",async()=>{
 const source=await read("business.js");
 assert.match(source,/const sourcesById=new Map\(sources\.map/);
 assert.match(source,/const leadCountByEmployee=new Map\(\)/);
 assert.match(source,/leadCountByEmployee\.get\(p\.id\)\|\|0/);
 const people=Array.from({length:220},(_,i)=>({id:"agent-"+i,qr_source_id:"src-"+i}));
 const sources=people.map(p=>({id:p.qr_source_id,code:p.id}));
 const leads=Array.from({length:11000},(_,i)=>({employee_id:people[i%people.length].id}));
 const old=()=>people.map(p=>({
  qr:sources.find(x=>x.id===p.qr_source_id)?.code,
  count:leads.filter(x=>x.employee_id===p.id).length
 }));
 const improved=()=>{
  const byQr=new Map(sources.map(x=>[x.id,x]));
  const counts=new Map();
  for(const lead of leads)counts.set(lead.employee_id,(counts.get(lead.employee_id)||0)+1);
  return people.map(p=>({qr:byQr.get(p.qr_source_id)?.code,count:counts.get(p.id)||0}));
 };
 assert.deepEqual(improved(),old());
 const before=performance.now();
 old();
 const oldMs=performance.now()-before;
 const after=performance.now();
 improved();
 const newMs=performance.now()-after;
 // Report measurements, not unstable speed-based assertions.
 console.log("synthetic team join, 220 staff / 11000 leads: prior="+oldMs.toFixed(2)+"ms indexed="+newMs.toFixed(2)+"ms");
});
