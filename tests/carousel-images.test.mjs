import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {spawn} from "node:child_process";
import net from "node:net";

const root=new URL("../",import.meta.url);
const load=name=>readFile(new URL(name,root),"utf8");
const waitForPort=async(port,child)=>{
 for(let i=0;i<50;i++){
  if(child.exitCode!==null)throw Error("Local server exited before startup");
  try{await new Promise((resolve,reject)=>{const socket=net.connect({host:"127.0.0.1",port},()=>{socket.end();resolve()});socket.on("error",reject)});return}
  catch{await new Promise(resolve=>setTimeout(resolve,80))}
 }
 throw Error("Local server failed to start");
};

test("All fictitious company logos are present in repository",async()=>{
 const html=await load("index.html");
 const paths=[...new Set([...html.matchAll(/src="(\/assets\/fictional-logos\/[^"]+\.svg)"/g)].map(m=>m[1]))];
 assert.equal(paths.length,10);
 for(const path of paths){
  const source=await load(path.slice(1));
  assert.match(source,/<svg\b/);
  assert.match(source,/<\/svg>/);
 }
});

test("Local server delivers original SVG carousel logos with image MIME and nosniff",async()=>{
 const port=await new Promise((resolve,reject)=>{
  const s=net.createServer();s.on("error",reject);s.listen(0,"127.0.0.1",()=>{const p=s.address().port;s.close(()=>resolve(p))})
 });
 const child=spawn(process.execPath,["server.mjs"],{cwd:new URL("../",import.meta.url),env:{...process.env,PORT:String(port),HOST:"127.0.0.1"},stdio:"ignore"});
 try{
  await waitForPort(port,child);
  for(const logo of ["sunharbor-auto","bluenest-realty","velora-beauty"]){
   const response=await fetch("http://127.0.0.1:"+port+"/assets/fictional-logos/"+logo+".svg");
   assert.equal(response.status,200,logo+" must be available");
   assert.match(response.headers.get("content-type")||"",/^image\/svg\+xml/);
   assert.equal(response.headers.get("x-content-type-options"),"nosniff");
   assert.match(await response.text(),/<svg\b/);
  }
 }finally{child.kill("SIGTERM")}
});
