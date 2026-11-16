import crypto from "node:crypto";
const COOKIE="__Host-nexus_admin";
const attempts=new Map();
const json=(status,data,cookies=[])=>({statusCode:status,headers:{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer","Pragma":"no-cache"},multiValueHeaders:cookies.length?{"Set-Cookie":cookies}:undefined,body:JSON.stringify(data)});
const configured=()=>Boolean(process.env.NEXUS_ADMIN_PIN && process.env.NEXUS_ADMIN_SESSION_SECRET && process.env.NEXUS_ADMIN_SESSION_SECRET.length>=32);
function same(a,b){const x=crypto.createHash("sha256").update(String(a)).digest();const y=crypto.createHash("sha256").update(String(b)).digest();return crypto.timingSafeEqual(x,y)}
const sign=s=>crypto.createHmac("sha256",process.env.NEXUS_ADMIN_SESSION_SECRET).update(s).digest("hex");
function session(event){
 if(!configured())return false;
 const header=event.headers.cookie||event.headers.Cookie||"";
 const raw=header.split(";").map(x=>x.trim()).find(x=>x.startsWith(COOKIE+"="))?.slice(COOKIE.length+1);
 if(!raw||!/^\d{10,13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(raw))return false;
 const last=raw.lastIndexOf("."),unsigned=raw.slice(0,last),mac=raw.slice(last+1);
 const expire=Number(unsigned.split(".")[0]);
 return expire>Date.now() && expire<Date.now()+3*60*60*1000 && same(sign(unsigned),mac);
}
const cookie=value=>COOKIE+"="+value+"; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=7200";
const clear=()=>COOKIE+"=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0";
function sameOrigin(e){
 const origin=e.headers.origin||e.headers.Origin;
 const host=e.headers.host||e.headers.Host;
 if(!origin||!host)return false;
 try{return new URL(origin).protocol==="https:" && new URL(origin).host===host}catch{return false}
}
export async function handler(event){
 if(event.httpMethod==="GET")return json(200,{authenticated:session(event)});
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!sameOrigin(event))return json(403,{error:"Origin rejected"});
 let data;try{if((event.body||"").length>300)throw Error("limit");data=JSON.parse(event.body||"{}")}catch{return json(400,{error:"Invalid request"})}
 if(data.action==="logout")return json(200,{authenticated:false},[clear()]);
 if(data.action!=="login")return json(400,{error:"Invalid request"});
 if(!configured())return json(503,{error:"Administrator login is not configured yet"});
 // Best-effort instance throttle; durable shared rate limiting must be added before production use.
 const ip=(event.headers["x-nf-client-connection-ip"]||event.headers["client-ip"]||"unknown").slice(0,80);
 const now=Date.now(),recent=(attempts.get(ip)||[]).filter(x=>now-x<20*60*1000);
 if(attempts.size>1500){for(const [k,v] of attempts){if(v.at(-1)<now-20*60*1000)attempts.delete(k)}}
 if(recent.length>=5)return json(429,{error:"Too many attempts. Try later"});
 if(typeof data.pin!=="string"||!/^[0-9]{4,12}$/.test(data.pin)||!same(data.pin,process.env.NEXUS_ADMIN_PIN)){
   recent.push(now);attempts.set(ip,recent);return json(401,{error:"Incorrect PIN"});
 }
 attempts.delete(ip);
 const unsigned=(now+2*60*60*1000)+"."+crypto.randomBytes(16).toString("hex");
 return json(200,{authenticated:true},[cookie(unsigned+"."+sign(unsigned))]);
}