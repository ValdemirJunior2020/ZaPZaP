import test from"node:test";import assert from"node:assert/strict";
import{readFile,stat}from"node:fs/promises";import{execFileSync}from"node:child_process";
import path from"node:path";import{fileURLToPath}from"node:url";
import{adapt}from"../vercel/lib/adapter.mjs";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
test("Vercel adapter carries auth headers, query values and request body",async()=>{
 const request=new Request("https://nexussales.vercel.app/.netlify/functions/owner-workspace?q=one",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer example","origin":"https://nexussales.vercel.app"},body:JSON.stringify({action:"test"})});
 const response=await adapt(request,async e=>{
  assert.equal(e.headers.authorization,"Bearer example");
  assert.equal(e.queryStringParameters.q,"one");
  assert.equal(e.httpMethod,"POST");
  assert.equal(JSON.parse(e.body).action,"test");
  assert.equal(e.isBase64Encoded,false);
  return{statusCode:200,headers:{"Content-Type":"application/json"},body:JSON.stringify({ok:true})};
 });
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
 assert.equal(response.headers.get("cache-control"),"no-store");
});
test("Vercel adapter preserves webhook verification plain text",async()=>{
 const response=await adapt(new Request("https://nexussales.vercel.app/api/whatsapp?hub.challenge=abc",{method:"GET"}),async e=>{
  assert.equal(e.queryStringParameters["hub.challenge"],"abc");
  return{statusCode:200,headers:{"Content-Type":"text/plain"},body:"abc"};
 });
 assert.equal(await response.text(),"abc");
});
test("Vercel configuration rewrites every old function URL",async()=>{
 const conf=JSON.parse(await readFile(path.join(root,"vercel.json"),"utf8"));
 assert.deepEqual(conf.rewrites.find(x=>x.source==="/.netlify/functions/:function"),{source:"/.netlify/functions/:function",destination:"/api/:function"});
 assert.ok(conf.rewrites.some(x=>x.source==="/s/:slug"));
 assert.ok(!conf.crons||conf.crons.length===0,"do not create ineffective or unauthenticated 2-minute cron jobs");
});
test("Vercel build copies no env, SQL, private function source or tunnel files",async()=>{
 execFileSync(process.execPath,["scripts/build-vercel.mjs"],{cwd:root});
 const output=path.join(root,"public");
 await stat(path.join(output,"index.html"));
 await stat(path.join(output,"assets","fictional-logos","sunharbor-auto.svg"));
 for(const secret of [".env",".gateway-token","netlify.toml","supabase","netlify","scripts","server.mjs"]){
  await assert.rejects(stat(path.join(output,secret)),{code:"ENOENT"});
 }
});

test("Hobby compatible Vercel deployment has at most 12 serverless entrypoints",async()=>{
 const{readdir}=await import("node:fs/promises");
 const entries=(await readdir(path.join(root,"api"))).filter(x=>x.endsWith(".mjs"));
 assert.ok(entries.length<=12,"Vercel Hobby max is 12; found "+entries.length);
 assert.equal(entries.length,11);
 const config=JSON.parse(await readFile(path.join(root,"vercel.json"),"utf8"));
 for(const name of ["demo-chat","public-config","public-store","widget-config"]){
  assert.ok(config.rewrites.some(x=>x.source==="/.netlify/functions/"+name&&x.destination==="/api/public?route="+name),name+" lost its original API route");
 }
});
test("Consolidated public endpoint invokes existing handlers only",async()=>{
 const {default:run}=await import("../api/public.mjs");
 const unknown=await run(new Request("https://nexussales.vercel.app/api/public?route=nope"));
 assert.equal(unknown.status,404);
 const valid=await run(new Request("https://nexussales.vercel.app/api/public?route=public-config"));
 assert.ok([200,503].includes(valid.status),"public-config reports configured or unavailable, not a route failure");
});
