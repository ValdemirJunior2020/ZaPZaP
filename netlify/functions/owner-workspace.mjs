import{env,db,json,str,slug,domainUrl,userFrom,ownStore,offerings,ownerProfile,access,postOrigin,parse,safeError,aiReady,iso}from "../lib/tenant.mjs";
const canEdit=ent=>!ent?.trial_started_at||access(ent).allowed;
const opts=["Product","Service","Package","Consultation","Custom quote"];
const avail=["Available","Booking required","Request a quote","In stock","Out of stock","Contact for availability"];
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
   const leads=store?await db(c,"nx_leads?store_id=eq."+encodeURIComponent(store.id)+"&select=id,customer_name,customer_email,customer_phone,interest,status,created_at&order=created_at.desc&limit=100"):[];
   return json(200,{email:user.email,profile,store,offerings:items,leads,access:access(ent),aiConfigured:aiReady()});
  }
  const data=parse(event,30000),action=str(data.action,40);
  if(!canEdit(ent)&&action!=="pause")return json(402,{error:"Your trial has ended. Subscribe to continue.",access:access(ent)});
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
  if(action==="publish"){
   if(!aiReady())return json(503,{error:"Live AI must be configured before your trial and public store can launch"});
   const current=await offerings(c,store.id);
   if(!current.length)return json(400,{error:"Add at least one product or service first"});
   const rows=await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(user.id)+"&trial_started_at=is.null",
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