import{widgetEnabled}from"../lib/billing.mjs";
import{env,db,json,str,slug,domainUrl,userFrom,ownStore,offerings,ownerProfile,access,postOrigin,parse,safeError,aiReady,verifyHostedAI,iso}from "../lib/tenant.mjs";
const canEdit=ent=>Boolean(ent?.is_complimentary)||!ent?.trial_started_at||access(ent).allowed;
const opts=["Product","Service","Package","Consultation","Custom quote"];
const avail=["Available","Booking required","Request a quote","In stock","Out of stock","Contact for availability"];
const leadStatuses=["New","Contacted","Appointment Requested","Booked","Won","Lost"];
export async function handler(event){
 const c=env();
 if(!["GET","POST"].includes(event.httpMethod))return json(405,{error:"Method not allowed"});
 if(event.httpMethod==="POST"&&!postOrigin(event))return json(403,{error:"Origin rejected"});
 try{
  const {user,ent}=await userFrom(event,c);
  if(!ent)return json(503,{error:"Trial registration not initialized"});
  let store=await ownStore(c,user.id);
  if(event.httpMethod==="GET"){
   const profile=await ownerProfile(c,user.id);
   const items=store?await offerings(c,store.id):[];
   const leads=store?await db(c,"nx_leads?store_id=eq."+encodeURIComponent(store.id)+"&select=id,customer_name,customer_email,customer_phone,interest,status,request_type,preferred_time,source_id,session_id,created_at,updated_at&order=created_at.desc&limit=100"):[];
   const qrSources=store?await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&select=id,code,label,enabled,offering_id,created_at&order=created_at.desc&limit=100"):[];
   let bot=null;
   if(store){try{const found=await db(c,"nx_bots?store_id=eq."+encodeURIComponent(store.id)+"&select=bot_id,enabled,greeting,primary_color");bot=found?.[0]||null}catch{}}
   return json(200,{email:user.email,profile,store,offerings:items,leads,qrSources,bot,widgetAllowed:widgetEnabled(c,ent),access:access(ent),aiConfigured:aiReady()});
  }
  const data=parse(event,30000),action=str(data.action,40);
  if(!canEdit(ent)&&!["pause","disable_widget","lead_history","update_lead"].includes(action))return json(402,{error:"Your trial has ended. Subscribe to continue.",access:access(ent)});
  if(action==="save_store"){
   const i=data.store||{};
   const name=str(i.name,150);
   if(name.length<2)return json(400,{error:"Enter a business name"});
   const requested=slug(i.slug||name);
   if(!requested||requested.length<3)return json(400,{error:"Store link must have at least three characters"});
   const saved={name,slug:requested,industry:str(i.industry,100)||"Other",
    headline:str(i.headline,180),description:str(i.description,2500),hours:str(i.hours,280),
    agent_name:str(i.agent_name,70)||"Business Assistant",store_image_url:domainUrl(i.store_image_url),
    color:/^#[a-fA-F0-9]{6}$/.test(i.color||"")?i.color:"#06aa77",updated_at:iso()};
   if(store){
    if(requested!==store.slug)return json(409,{error:"Store links are permanent once created. Contact support to change yours."});
    const rows=await db(c,"nx_stores?id=eq."+encodeURIComponent(store.id)+"&owner_id=eq."+encodeURIComponent(user.id),{method:"PATCH",body:saved,prefer:"return=representation"});
    store=rows?.[0];
   }else{
    const rows=await db(c,"nx_stores",{method:"POST",body:{...saved,owner_id:user.id,published:false},prefer:"return=representation"});
    store=rows?.[0];
   }
   return json(200,{store});
  }
  if(!store)return json(400,{error:"Save your business details first"});
  if(action==="save_chat_settings"){
   const count=Number(data.chatMaxMessages),minutes=Number(data.chatMaxMinutes);
   if(!Number.isInteger(count)||count<5||count>30||!Number.isInteger(minutes)||minutes<5||minutes>30)return json(400,{error:"Choose 5–30 messages and 5–30 minutes"});
   const rows=await db(c,"nx_stores?id=eq."+encodeURIComponent(store.id)+"&owner_id=eq."+encodeURIComponent(user.id),
    {method:"PATCH",body:{chat_max_messages:count,chat_max_minutes:minutes,appointments_enabled:data.appointmentsEnabled===true,updated_at:iso()},prefer:"return=representation"});
   return json(200,{store:rows[0]});
  }
  if(action==="create_qr"){
   if(!store.published)return json(400,{error:"Publish your SmartStore before creating QR codes"});
   const label=str(data.label,80);
   if(label.length<2)return json(400,{error:"Enter a QR label (at least 2 characters)"});
   const existing=await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&select=id&limit=101");
   if(existing.length>=100)return json(403,{error:"Maximum 100 tracked QR codes per store"});
   const offeringId=data.offeringId&&/^[0-9a-f-]{36}$/i.test(data.offeringId)?data.offeringId:null;
   if(offeringId){const match=await db(c,"nx_offerings?id=eq."+encodeURIComponent(offeringId)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id");if(!match?.length)return json(400,{error:"Offering does not belong to this business"})}
   const rows=await db(c,"nx_qr_sources",{method:"POST",body:{store_id:store.id,label,offering_id:offeringId,enabled:true},prefer:"return=representation"});
   return json(201,{source:rows[0]});
  }
  if(action==="set_qr_enabled"){
   if(!/^[0-9a-f-]{36}$/i.test(data.id||""))return json(400,{error:"Invalid QR code"});
   const rows=await db(c,"nx_qr_sources?id=eq."+encodeURIComponent(data.id)+"&store_id=eq."+encodeURIComponent(store.id),
    {method:"PATCH",body:{enabled:data.enabled===true},prefer:"return=representation"});
   if(!rows?.length)return json(404,{error:"QR code not found"});
   return json(200,{source:rows[0]});
  }
  if(action==="lead_history"){
   if(!/^[0-9a-f-]{36}$/i.test(data.id||""))return json(400,{error:"Invalid lead"});
   const leads=await db(c,"nx_leads?id=eq."+encodeURIComponent(data.id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,session_id");
   const found=leads?.[0];if(!found)return json(404,{error:"Lead not found"});
   const messages=found.session_id?await db(c,"nx_chat_messages?session_id=eq."+encodeURIComponent(found.session_id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=role,content,created_at&order=id.asc&limit=80"):[];
   return json(200,{messages});
  }
  if(action==="update_lead"){
   if(!/^[0-9a-f-]{36}$/i.test(data.id||"")||!leadStatuses.includes(data.status))return json(400,{error:"Invalid lead status"});
   const rows=await db(c,"nx_leads?id=eq."+encodeURIComponent(data.id)+"&store_id=eq."+encodeURIComponent(store.id),
    {method:"PATCH",body:{status:data.status,updated_at:iso()},prefer:"return=representation"});
   if(!rows?.length)return json(404,{error:"Lead not found"});
   return json(200,{lead:rows[0]});
  }
  if(action==="save_offering"){
   const p=data.offering||{},name=str(p.name,130);
   if(!name)return json(400,{error:"Product or service name is required"});
   const item={name,type:opts.includes(p.type)?p.type:"Service",description:str(p.description,2000),
    price_label:str(p.price_label,70),status:avail.includes(p.status)?p.status:"Contact for availability",
    image_url:domainUrl(p.image_url),sort_order:Number.isInteger(p.sort_order)&&p.sort_order>=0&&p.sort_order<10000?p.sort_order:0};
   let rows;
   if(p.id&&/^[0-9a-f-]{36}$/i.test(p.id)){
    rows=await db(c,"nx_offerings?id=eq."+encodeURIComponent(p.id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:item,prefer:"return=representation"});
    if(!rows?.length)return json(404,{error:"Offering not found"});
   }else{
    const current=await offerings(c,store.id);if(current.length>=100)return json(403,{error:"Offering limit reached"});
    rows=await db(c,"nx_offerings",{method:"POST",body:{...item,store_id:store.id},prefer:"return=representation"});
   }
   return json(200,{offering:rows[0]});
  }
  if(action==="delete_offering"){
   if(!/^[0-9a-f-]{36}$/i.test(data.id||""))return json(400,{error:"Invalid offering"});
   await db(c,"nx_offerings?id=eq."+encodeURIComponent(data.id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"DELETE",prefer:"return=minimal"});
   return json(200,{deleted:true});
  }
  if(action==="enable_widget"){
   if(!widgetEnabled(c,ent))return json(402,{error:"Website widget requires an active bundled subscription ($228/month) after the trial"});
   if(!store.published)return json(400,{error:"Publish your business first"});
   const existing=await db(c,"nx_bots?store_id=eq."+encodeURIComponent(store.id)+"&select=bot_id");
   if(existing?.[0]){
    await db(c,"nx_bots?store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{enabled:true,updated_at:iso()},prefer:"return=minimal"});
    return json(200,{botId:existing[0].bot_id,enabled:true});
   }
   const rows=await db(c,"nx_bots",{method:"POST",body:{store_id:store.id,enabled:true,greeting:"Hi! How can I help you today?"},prefer:"return=representation"});
   return json(200,{botId:rows[0].bot_id,enabled:true});
  }
  if(action==="disable_widget"){
   await db(c,"nx_bots?store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{enabled:false,updated_at:iso()},prefer:"return=minimal"});
   return json(200,{enabled:false});
  }
  if(action==="publish"){
   if(!aiReady())return json(503,{error:"Live AI must be configured before your trial and public store can launch"});
   const current=await offerings(c,store.id);
   if(!current.length)return json(400,{error:"Add at least one product or service first"});
   if(!await verifyHostedAI())return json(503,{error:"The hosted AI is not responding. Your 48-hour trial has not started. Please try after AI setup is repaired."});
   const rows=ent.is_complimentary?[]:await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(user.id)+"&trial_started_at=is.null",
    {method:"PATCH",body:{trial_started_at:iso(),updated_at:iso()},prefer:"return=representation"});
   const next=rows?.[0]||await (async()=>{const t=await userFrom(event,c);return t.ent})();
   if(!access(next).allowed)return json(402,{error:"Trial has ended. Subscribe to continue"});
   const updated=await db(c,"nx_stores?id=eq."+encodeURIComponent(store.id)+"&owner_id=eq."+encodeURIComponent(user.id),
    {method:"PATCH",body:{published:true,updated_at:iso()},prefer:"return=representation"});
   return json(200,{store:updated?.[0],access:access(next)});
  }
  if(action==="pause"){
   await db(c,"nx_stores?id=eq."+encodeURIComponent(store.id)+"&owner_id=eq."+encodeURIComponent(user.id),
    {method:"PATCH",body:{published:false,updated_at:iso()},prefer:"return=minimal"});
   return json(200,{published:false});
  }
  return json(400,{error:"Unknown action"});
 }catch(err){
  console.error("Owner workspace:",err.message);
  if(/duplicate key/i.test(err.message))return json(409,{error:"That SmartLink is already taken. Choose another store name."});
  return safeError(err);
 }
}