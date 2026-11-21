// Server-only per-owner Google Calendar integration. No token reaches browser JavaScript.
import crypto from "node:crypto";
import{env,db}from"./billing.mjs";
const googleApi="https://www.googleapis.com/calendar/v3";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const scopes=["https://www.googleapis.com/auth/calendar.events","https://www.googleapis.com/auth/userinfo.email"];
const error=(status,message)=>Object.assign(new Error(message),{status});
function config(){
 const clientId=process.env.NEXUS_GOOGLE_CLIENT_ID||"",clientSecret=process.env.NEXUS_GOOGLE_CLIENT_SECRET||"";
 const redirectUri=process.env.NEXUS_GOOGLE_REDIRECT_URI||"",key=process.env.NEXUS_GOOGLE_TOKEN_ENCRYPTION_KEY||"";
 const stateSecret=process.env.NEXUS_GOOGLE_OAUTH_STATE_SECRET||"";
 let parsed;try{parsed=new URL(redirectUri)}catch{}
 const validRedirect=parsed&&parsed.pathname==="/.netlify/functions/google-calendar-callback"&&
  (parsed.protocol==="https:"||parsed.protocol==="http:"&&["localhost","127.0.0.1"].includes(parsed.hostname));
 const cryptoKey=/^[a-f0-9]{64}$/i.test(key)?Buffer.from(key,"hex"):Buffer.from(key,"base64");
 if(!clientId||!clientSecret||!validRedirect||cryptoKey.length!==32||stateSecret.length<32)throw error(503,"Google Calendar is not configured yet");
 return{clientId,clientSecret,redirectUri,cryptoKey,stateSecret};
}
function encrypt(value,key){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key,iv);
 const ciphertext=Buffer.concat([cipher.update(String(value),"utf8"),cipher.final()]);
 return [iv,cipher.getAuthTag(),ciphertext].map(x=>x.toString("base64url")).join(".");
}
function decrypt(value,key){
 const parts=String(value||"").split(".");if(parts.length!==3)throw error(503,"Calendar connection needs reconnection");
 const [iv,tag,body]=parts.map(s=>Buffer.from(s,"base64url"));if(iv.length!==12||tag.length!==16)throw error(503,"Calendar connection needs reconnection");
 const d=crypto.createDecipheriv("aes-256-gcm",key,iv);d.setAuthTag(tag);
 return Buffer.concat([d.update(body),d.final()]).toString("utf8");
}
const sign=(payload,secret)=>crypto.createHmac("sha256",secret).update(payload).digest("base64url");
function createState(ownerId,storeId,secret,now=Date.now()){
 if(!uuid.test(ownerId)||!uuid.test(storeId))throw error(400,"Invalid business account");
 const nonce=crypto.randomBytes(20).toString("base64url");
 const payload=[ownerId,storeId,Math.floor(now/1000),nonce].join(".");
 return{state:payload+"."+sign(payload,secret),nonce};
}
function validateState(state,cookie,secret,now=Date.now()){
 const parts=String(state||"").split(".");if(parts.length!==5)throw error(403,"Calendar connection could not be verified");
 const [ownerId,storeId,issued,nonce,mac]=parts;
 const payload=parts.slice(0,4).join(".");
 const expected=sign(payload,secret),a=Buffer.from(mac),b=Buffer.from(expected);
 if(!uuid.test(ownerId)||!uuid.test(storeId)||a.length!==b.length||!crypto.timingSafeEqual(a,b))throw error(403,"Calendar connection could not be verified");
 const seconds=Number(issued);
 if(!Number.isSafeInteger(seconds)||seconds*1000>now+30000||now-seconds*1000>600000||nonce!==cookie)throw error(403,"Calendar connection expired. Please try again");
 return{ownerId,storeId};
}
const cookieFor=(nonce,secure)=>"nexus_google_oauth="+nonce+"; HttpOnly; SameSite=Lax; Path=/.netlify/functions/google-calendar-callback; Max-Age=600"+(secure?"; Secure":"");
const clearCookie=secure=>cookieFor("",secure).replace("Max-Age=600","Max-Age=0");
function startConnect(ownerId,storeId){
 const c=config(),{state,nonce}=createState(ownerId,storeId,c.stateSecret);
 const p=new URLSearchParams({client_id:c.clientId,redirect_uri:c.redirectUri,response_type:"code",
  scope:scopes.join(" "),access_type:"offline",prompt:"consent",state});
 return{url:"https://accounts.google.com/o/oauth2/v2/auth?"+p, cookie:cookieFor(nonce,c.redirectUri.startsWith("https:"))};
}
async function http(url,options={}){
 const r=await fetch(url,{...options,signal:AbortSignal.timeout(10000)});
 const body=await r.json().catch(()=>({}));
 if(!r.ok){if(r.status===401||body?.error==="invalid_grant")throw error(401,"Google Calendar connection expired. Reconnect your account");
  if(r.status===409)throw error(409,"This calendar event already exists");
  if(r.status===403)throw error(403,"Google Calendar access was not granted");
  throw error(503,"Google Calendar is temporarily unavailable")}
 return body;
}
async function finishConnect(event){
 const c=config(),query=event.queryStringParameters||{},cookie=String(event.headers.cookie||event.headers.Cookie||"").split(";").map(x=>x.trim()).find(x=>x.startsWith("nexus_google_oauth="))?.slice(19)||"";
 if(query.error)throw error(403,"Google Calendar connection was declined");
 const {ownerId,storeId}=validateState(query.state,cookie,c.stateSecret);
 const cfg=env(),stores=await db(cfg,"nx_stores?id=eq."+encodeURIComponent(storeId)+"&owner_id=eq."+encodeURIComponent(ownerId)+"&select=id");
 if(stores?.length!==1)throw error(403,"Business account is no longer available");
 if(!query.code||String(query.code).length>2048)throw error(400,"Missing authorization code");
 const body=new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,redirect_uri:c.redirectUri,grant_type:"authorization_code",code:String(query.code)});
 const tokens=await http("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body});
 if(!tokens.access_token||!tokens.refresh_token)throw error(503,"Google did not supply offline access. Disconnect and reconnect");
 const account=await http("https://www.googleapis.com/oauth2/v2/userinfo",{headers:{Authorization:"Bearer "+tokens.access_token}});
 if(!account.email||account.verified_email===false)throw error(403,"A verified Google email is required");
 const now=new Date().toISOString();
 await db(cfg,"nx_google_calendar_connections?on_conflict=owner_id",{method:"POST",prefer:"resolution=merge-duplicates,return=minimal",body:{
  owner_id:ownerId,store_id:storeId,google_email:String(account.email).slice(0,250),
  access_cipher:encrypt(tokens.access_token,c.cryptoKey),refresh_cipher:encrypt(tokens.refresh_token,c.cryptoKey),
  expires_at:new Date(Date.now()+Math.max(60,Number(tokens.expires_in)||3600)*1000-60000).toISOString(),
  state:"connected",updated_at:now
 }});
 return{ownerId,storeId};
}
async function connection(cfg,ownerId,storeId){
 const rows=await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId)+"&store_id=eq."+encodeURIComponent(storeId)+"&select=*");
 return rows?.[0]||null;
}
async function status(ownerId,storeId){
 const row=await connection(env(),ownerId,storeId);
 return{connected:row?.state==="connected",googleEmail:row?.state==="connected"?row.google_email:null,
  status:row?.state||"disconnected",syncStatus:row?.last_sync_status||"not_synced",lastSyncAt:row?.last_sync_at||null};
}
async function tokenFor(ownerId,storeId){
 const c=config(),cfg=env(),row=await connection(cfg,ownerId,storeId);
 if(!row||row.state!=="connected")throw error(409,"Connect Google Calendar to continue");
 if(Date.parse(row.expires_at)>Date.now()+60000)return{token:decrypt(row.access_cipher,c.cryptoKey),row,cfg};
 const body=new URLSearchParams({client_id:c.clientId,client_secret:c.clientSecret,refresh_token:decrypt(row.refresh_cipher,c.cryptoKey),grant_type:"refresh_token"});
 let tokens;try{tokens=await http("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body})}
 catch(e){if(e.status===401)await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId)+"&store_id=eq."+encodeURIComponent(storeId),{method:"PATCH",body:{state:"reconnect_required",updated_at:new Date().toISOString()},prefer:"return=minimal"});throw e}
 if(!tokens.access_token)throw error(503,"Google Calendar must be reconnected");
 await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId)+"&store_id=eq."+encodeURIComponent(storeId),{
  method:"PATCH",body:{access_cipher:encrypt(tokens.access_token,c.cryptoKey),refresh_cipher:tokens.refresh_token?encrypt(tokens.refresh_token,c.cryptoKey):row.refresh_cipher,
   expires_at:new Date(Date.now()+Math.max(60,Number(tokens.expires_in)||3600)*1000-60000).toISOString(),updated_at:new Date().toISOString()},prefer:"return=minimal"});
 return{token:tokens.access_token,row,cfg};
}
async function googleCall(token,method,path,body){
 return http(googleApi+path,{method,headers:{Authorization:"Bearer "+token,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
}
async function events(ownerId,storeId){
 const {token}=await tokenFor(ownerId,storeId),min=new Date().toISOString();
 const path="/calendars/primary/events?"+new URLSearchParams({timeMin:min,singleEvents:"true",orderBy:"startTime",maxResults:"40"});
 const r=await googleCall(token,"GET",path);
 return(r.items||[]).filter(e=>e.status!=="cancelled").map(e=>({id:e.id,title:String(e.summary||"Busy").slice(0,150),
  start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,htmlLink:e.htmlLink||null})).slice(0,40);
}
async function syncAppointment(ownerId,storeId,appointmentId){
 if(!uuid.test(appointmentId))throw error(400,"Invalid appointment");
 const {token,cfg}=await tokenFor(ownerId,storeId);
 const found=await db(cfg,"nx_appointments?id=eq."+encodeURIComponent(appointmentId)+"&store_id=eq."+encodeURIComponent(storeId)+"&select=id,start_at,end_at,status,customer_name,notes");
 const ap=found?.[0];if(!ap)throw error(404,"Appointment not found for this business");
 const id="nxs"+crypto.createHash("sha256").update(ap.id).digest("hex").slice(0,40);
 const path="/calendars/primary/events/"+id;
 if(ap.status==="cancelled"){
  const r=await fetch(googleApi+path,{method:"DELETE",headers:{Authorization:"Bearer "+token},signal:AbortSignal.timeout(10000)});
  if(!r.ok&&r.status!==404)throw error(503,"Unable to cancel the Google Calendar event");
  await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId),{method:"PATCH",body:{last_sync_at:new Date().toISOString(),last_sync_status:"synced"},prefer:"return=minimal"});
  return{synced:true,cancelled:true,googleEventId:id};
 }
 if(ap.status!=="confirmed")throw error(409,"Only confirmed appointments can sync to Google Calendar");
 const start=new Date(ap.start_at),end=new Date(ap.end_at);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw error(400,"Appointment time is invalid");
 // Check all conflicting Google events before synchronization, excluding this appointment's deterministic ID.
 const listPath="/calendars/primary/events?"+new URLSearchParams({timeMin:start.toISOString(),timeMax:end.toISOString(),singleEvents:"true",maxResults:"100"});
 const busy=await googleCall(token,"GET",listPath);
 const conflict=(busy.items||[]).some(e=>{
  if(e.id===id||e.status==="cancelled"||e.transparency==="transparent")return false;
  const a=Date.parse(e.start?.dateTime||e.start?.date),b=Date.parse(e.end?.dateTime||e.end?.date);
  return Number.isFinite(a)&&Number.isFinite(b)&&a<end.getTime()&&b>start.getTime();
 });
 if(conflict)throw error(409,"Google Calendar is busy at this time. Choose another slot");
 const body={id,summary:"Nexus appointment: "+String(ap.customer_name||"Customer").slice(0,100),
  description:"Confirmed through Nexus AI. Appointment reference: "+ap.id,
  start:{dateTime:start.toISOString()},end:{dateTime:end.toISOString()}};
 // First create, then update by deterministic ID to make repeated syncs idempotent.
 let response=await fetch(googleApi+"/calendars/primary/events",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 if(response.status===409){
  response=await fetch(googleApi+path,{method:"PATCH",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 }
 if(!response.ok)throw error(503,"Google Calendar could not synchronize this appointment");
 await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId)+"&store_id=eq."+encodeURIComponent(storeId),{
  method:"PATCH",body:{last_sync_at:new Date().toISOString(),last_sync_status:"synced"},prefer:"return=minimal"});
 return{synced:true,googleEventId:id};
}
async function disconnect(ownerId,storeId){
 const cfg=env();
 await db(cfg,"nx_google_calendar_connections?owner_id=eq."+encodeURIComponent(ownerId)+"&store_id=eq."+encodeURIComponent(storeId),{method:"DELETE",prefer:"return=minimal"});
 return{disconnected:true,eventsRetainedInGoogle:true};
}
export{config,encrypt,decrypt,createState,validateState,startConnect,finishConnect,clearCookie,status,events,syncAppointment,disconnect};
