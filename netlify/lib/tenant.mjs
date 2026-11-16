import{env,db,authenticate,entitlement,access,json}from "./billing.mjs";
const iso=()=>new Date().toISOString();
const slug=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,48);
const str=(value,max)=>String(value??"").trim().slice(0,max);
function domainUrl(value){
 const v=str(value,2048);
 if(!v)return null;
 try{const u=new URL(v);return u.protocol==="https:"&&u.username===""&&u.password===""?u.toString():null}catch{return null}
}
const only=(obj,names)=>Object.fromEntries(names.filter(k=>obj?.[k]!==undefined).map(k=>[k,obj[k]]));
async function userFrom(event,c){const user=await authenticate(event,c);return{user,ent:await entitlement(c,user.id)}}
async function ownStore(c,id){const rows=await db(c,"nx_stores?owner_id=eq."+encodeURIComponent(id)+"&select=*");return rows?.[0]||null}
async function offerings(c,storeId){return await db(c,"nx_offerings?store_id=eq."+encodeURIComponent(storeId)+"&select=*&order=sort_order.asc,created_at.asc")||[]}
async function ownerProfile(c,id){const rows=await db(c,"nx_owner_profiles?owner_id=eq."+encodeURIComponent(id)+"&select=business_name,phone");return rows?.[0]||null}
async function publishedStore(c,storeSlug){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug)||storeSlug.length>50)return null;
 const stores=await db(c,"nx_stores?slug=eq."+encodeURIComponent(storeSlug)+"&published=eq.true&select=*");
 const store=stores?.[0];if(!store)return null;
 const ent=await entitlement(c,store.owner_id);if(!access(ent).allowed)return null;
 return {store,ent,items:await offerings(c,store.id)};
}
function headers(event){return{"Content-Type":"application/json","Cache-Control":"no-store"}}
function postOrigin(e){
 const o=e.headers.origin||e.headers.Origin||"";
 const h=e.headers.host||e.headers.Host||"";
 return o==="https://"+h || (process.env.CONTEXT!=="production"&&o==="http://localhost:8888");
}
function parse(event,max=16000){if(!event.body||event.body.length>max)throw Object.assign(new Error("Invalid request"),{status:400});try{return JSON.parse(event.body)}catch{throw Object.assign(new Error("Invalid JSON"),{status:400})}}
function safeError(e){return json(e.status||503,{error:e.status===401?"Sign in to continue":e.status===400?e.message:"Service temporarily unavailable"})}
function aiReady(){return process.env.NEXUS_LIVE_CHAT_ENABLED==="true"&&Boolean(process.env.OPENAI_API_KEY)}
export{env,db,authenticate,entitlement,access,json,iso,slug,str,domainUrl,only,userFrom,ownStore,offerings,ownerProfile,publishedStore,postOrigin,parse,safeError,aiReady};
