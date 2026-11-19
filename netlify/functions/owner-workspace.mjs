import{SPECIAL_OWNER,NEXUS_STYLE,validHandle,validStyle}from"../lib/personal-assistant.mjs";
import{JUNIOR_OWNER_ID}from"../lib/junior-assistant.mjs";
import{normalizePersonality,PERSONALITIES}from"../lib/ai-personalities.mjs";
import{normalizeProfile}from"../lib/nexus-business-profile.mjs";
import{cancelSubscription,deleteAccount}from"../lib/account-lifecycle.mjs";
import{widgetEnabled}from"../lib/billing.mjs";
import{env,db,json,str,slug,domainUrl,userFrom,ownStore,offerings,ownerProfile,access,postOrigin,parse,safeError,aiReady,verifyHostedAI,iso}from "../lib/tenant.mjs";
const teamEntitled=(user,ent)=>Boolean(user.id===SPECIAL_OWNER&&ent?.is_complimentary===true||(ent?.subscription_status==="ACTIVE"&&(ent?.billing_tier==="business"&&Number(ent.billing_employee_limit)>=3||[process.env.NEXUS_PAYPAL_ENTERPRISE_BR_PLAN_ID,process.env.NEXUS_PAYPAL_ENTERPRISE_GLOBAL_PLAN_ID].filter(Boolean).includes(ent?.paypal_plan_id))));
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
   let leads=store?await db(c,"nx_leads?store_id=eq."+encodeURIComponent(store.id)+"&select=id,customer_name,customer_email,customer_phone,interest,status,request_type,preferred_time,source_id,session_id,employee_id,created_at,updated_at&order=created_at.desc&limit=100"):[];
   const qrSources=store?await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&select=id,code,label,enabled,offering_id,scan_count,created_at&order=created_at.desc&limit=100"):[];
   let personalRows=[],personalSchemaReady=true;
   if(store){try{personalRows=await db(c,"nx_personal_assistants?owner_id=eq."+encodeURIComponent(user.id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,handle,display_name,personality,greeting,about,enabled,max_messages,max_minutes,public_contact_phone,publish_contact_phone")}catch(error){personalSchemaReady=false}}
   if(store&&personalSchemaReady){try{
    leads=await db(c,"nx_leads?store_id=eq."+encodeURIComponent(store.id)+"&select=id,customer_name,customer_email,customer_phone,interest,status,request_type,preferred_time,source_id,session_id,employee_id,personal_assistant_id,created_at,updated_at&order=created_at.desc&limit=100");
   }catch(error){console.error("Personal lead fields unavailable:",error.message)}}
   const employees=store&&teamEntitled(user,ent)?await db(c,"nx_employees?store_id=eq."+encodeURIComponent(store.id)+"&archived=eq.false&select=id,name,role,whatsapp,language,enabled,qr_source_id,created_at&order=created_at.asc"):[];
   const appointments=store?await db(c,"nx_appointments?store_id=eq."+encodeURIComponent(store.id)+"&select=id,store_id,lead_id,employee_id,staff_id,service_id,customer_name,customer_email,customer_phone,notes,start_at,end_at,status,created_at,updated_at&order=start_at.desc&limit=500"):[];
   let bot=null;
   if(store){try{const found=await db(c,"nx_bots?store_id=eq."+encodeURIComponent(store.id)+"&select=bot_id,enabled,greeting,primary_color");bot=found?.[0]||null}catch{}}
   let businessProfile=null;
   if(store){try{businessProfile=(await db(c,"nx_business_profiles?store_id=eq."+encodeURIComponent(store.id)+"&select=*"))?.[0]||null}catch(e){console.warn("Business profile unavailable:",e.message)}}
   return json(200,{email:user.email,profile,store,businessProfile,offerings:items,leads,qrSources,employees,appointments,teamAllowed:teamEntitled(user,ent),bot,personalAssistant:personalRows[0]||null,personalAssistantSchemaReady:personalSchemaReady,personalAssistantSpecial:user.id===SPECIAL_OWNER&&ent.is_complimentary===true,widgetAllowed:widgetEnabled(c,ent),access:access(ent),aiConfigured:aiReady()});
  }
  const data=parse(event,30000),action=str(data.action,40);
  if(action==="cancel_subscription")return cancelSubscription(c,user,ent);
  if(action==="delete_account")return deleteAccount(c,user,ent,data);

  if(action==="ai_error_logs"){
   if(user.id!==SPECIAL_OWNER||ent.is_complimentary!==true)return json(403,{error:"Logs unavailable for this account"});
   if(!store)return json(200,{logs:[]});
   const logs=await db(c,"nx_ai_error_logs?owner_id=eq."+encodeURIComponent(user.id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,created_at,stage,error_code,elapsed_ms&order=created_at.desc&limit=100");
   return json(200,{logs:logs||[]});
  }
  if(["save_employee","set_employee_enabled","delete_employee"].includes(action)&&!teamEntitled(user,ent))return json(403,{error:"A gestão de equipe requer o novo plano Empresarial confirmado. Os planos antigos permanecem inalterados."});
  if(!canEdit(ent)&&!["pause","disable_widget","lead_history","update_lead"].includes(action))return json(402,{error:"Your trial has ended. Subscribe to continue.",access:access(ent)});
  if(action==="set_interface_language"){
   if(!store)return json(400,{error:"Create your business first"});
   const language=String(data.language||"").trim().toLowerCase();
   if(!["en","es","pt"].includes(language))return json(400,{error:"Choose English, Español or Português"});
   const rows=await db(c,"nx_business_profiles?on_conflict=store_id",{method:"POST",
    body:{store_id:store.id,interface_language:language,updated_at:iso()},
    prefer:"resolution=merge-duplicates,return=representation"});
   return json(200,{language:rows?.[0]?.interface_language||language});
  }
  if(action==="save_business_profile"){
   if(!store)return json(400,{error:"Save your SmartStore before setting business hours"});
   let profile;
   try{profile=normalizeProfile(data.profile)}catch(e){return json(400,{error:e.message})}
   const rows=await db(c,"nx_business_profiles?on_conflict=store_id",{method:"POST",body:{store_id:store.id,...profile,updated_at:iso()},prefer:"resolution=merge-duplicates,return=representation"});
   return json(200,{businessProfile:rows?.[0]||null});
  }
  if(ent.billing_tier==="personal"&&ent.subscription_status==="ACTIVE"&&!["save_store","save_personal_assistant"].includes(action))return json(403,{error:"Personal Assistant subscription does not include business management features"});
  if(action==="save_store"){
   const i=data.store||{};
   const name=str(i.name,150);
   if(name.length<2)return json(400,{error:"Enter a business name"});
   const requested=slug(i.slug||name);
   if(!requested||requested.length<3)return json(400,{error:"Store link must have at least three characters"});
   if(i.ai_personality!==undefined&&!Object.hasOwn(PERSONALITIES,i.ai_personality))return json(400,{error:"Choose a valid AI personality"});
   const saved={name,slug:requested,industry:str(i.industry,100)||"Other",ai_personality:normalizePersonality(i.ai_personality),
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

  if(action==="save_employee"){
   const d=data.employee||{},name=str(d.name,80),role=str(d.role,80)||"Vendedor";
   const whatsapp=String(d.whatsapp||"").replace(/\D/g,"");
   if(name.length<2||role.length<2||!/^[1-9][0-9]{9,14}$/.test(whatsapp))return json(400,{error:"Nome, cargo e WhatsApp com DDI são obrigatórios"});
   if(!["pt_BR","en_US","es_ES"].includes(d.language))return json(400,{error:"Idioma inválido"});
   const employees=await db(c,"nx_employees?store_id=eq."+encodeURIComponent(store.id)+"&select=id,qr_source_id,enabled,archived");
   if(d.id){
    if(!employees.some(x=>x.id===d.id&&!x.archived))return json(404,{error:"Funcionário não pertence a esta loja"});
    const rows=await db(c,"nx_employees?id=eq."+encodeURIComponent(d.id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{name,role,whatsapp,language:d.language,updated_at:iso()},prefer:"return=representation"});
    return json(200,{employee:rows[0]});
   }
   const limit=user.id===SPECIAL_OWNER&&ent.is_complimentary===true?20:ent.billing_tier==="business"&&ent.subscription_status==="ACTIVE"?Math.max(3,Number(ent.billing_employee_limit)||3):3;
   if(employees.filter(x=>x.enabled&&!x.archived).length>=limit)return json(402,{error:"Os três funcionários incluídos estão completos. Upgrade your subscription to add more employees."});
   const sources=await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&select=id&limit=101");
   if(sources.length>=100)return json(403,{error:"Limite de QR Codes atingido"});
   const qr=await db(c,"nx_qr_sources",{method:"POST",body:{store_id:store.id,label:"Vendedor: "+name,enabled:true},prefer:"return=representation"});
   try{
    const rows=await db(c,"nx_employees",{method:"POST",body:{store_id:store.id,qr_source_id:qr[0].id,name,role,whatsapp,language:d.language},prefer:"return=representation"});
    return json(201,{employee:rows[0],qrSource:qr[0]});
   }catch(error){
    await db(c,"nx_qr_sources?id=eq."+qr[0].id+"&store_id=eq."+encodeURIComponent(store.id),{method:"DELETE",prefer:"return=minimal"}).catch(()=>{});
    throw error;
   }
  }
  if(action==="set_employee_enabled"||action==="delete_employee"){
   const id=str(data.id,40);
   if(!/^[0-9a-f-]{36}$/i.test(id))return json(400,{error:"Funcionário inválido"});
   const rows=await db(c,"nx_employees?id=eq."+encodeURIComponent(id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,qr_source_id,archived");
   if(!rows.length||rows[0].archived)return json(404,{error:"Funcionário não encontrado"});
   const employee=rows[0],enabled=data.enabled===true;
   if(action==="set_employee_enabled"&&enabled){
    const active=await db(c,"nx_employees?store_id=eq."+encodeURIComponent(store.id)+"&enabled=eq.true&archived=eq.false&select=id");
    const limit=user.id===SPECIAL_OWNER&&ent.is_complimentary===true?20:ent.billing_tier==="business"&&ent.subscription_status==="ACTIVE"?Math.max(3,Number(ent.billing_employee_limit)||3):3;
    if(active.length>=limit)return json(402,{error:"Limite de funcionários ativos. Funcionários extras exigem pagamento confirmado."});
   }
   if(action==="delete_employee"){
    await db(c,"nx_employees?id=eq."+encodeURIComponent(id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{enabled:false,archived:true,updated_at:iso()},prefer:"return=minimal"});
   }else{
    await db(c,"nx_employees?id=eq."+encodeURIComponent(id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{enabled,updated_at:iso()},prefer:"return=minimal"});
   }
   if(employee.qr_source_id)await db(c,"nx_qr_sources?id=eq."+encodeURIComponent(employee.qr_source_id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{enabled:action==="delete_employee"?false:enabled},prefer:"return=minimal"});
   return json(200,{updated:true});
  }
  if(action==="save_personal_assistant"){
   const a=data.assistant||{},name=str(a.name,50),handle=String(a.handle||"").trim().toLowerCase();
   if(name.length<2)return json(400,{error:"Enter an assistant name of at least two characters"});
   if(!validHandle(handle))return json(400,{error:"Public link ID must be 3–32 characters, start with a letter and use letters, numbers or single hyphens"});
   if(!validStyle(a.personality,user.id)||(a.personality===NEXUS_STYLE&&ent.is_complimentary!==true))return json(403,{error:"Personality unavailable for this account"});
   const maxMessages=Number(a.maxMessages),maxMinutes=Number(a.maxMinutes);
   if(!Number.isInteger(maxMessages)||maxMessages<5||maxMessages>30||!Number.isInteger(maxMinutes)||maxMinutes<5||maxMinutes>30)return json(400,{error:"Limits must be 5–30 messages and 5–30 minutes"});
   const publicPhone=String(a.contactPhone||"").replace(/[\s()\-]/g,"");
   if(publicPhone&&!/^\+[1-9][0-9]{7,14}$/.test(publicPhone))return json(400,{error:"Enter an international phone number such as +15551234567"});
   if(a.publishContactPhone===true&&!publicPhone)return json(400,{error:"Enter your phone number before enabling public phone contact"});
   const current=await db(c,"nx_personal_assistants?owner_id=eq."+encodeURIComponent(user.id)+"&select=id,handle");
   if(current[0]&&current[0].handle!==handle)return json(409,{error:"Public link cannot be changed after creation"});
   const row={owner_id:user.id,store_id:store.id,handle,display_name:name,personality:a.personality,
    greeting:str(a.greeting,400),about:str(a.about,900),enabled:a.enabled===true,max_messages:maxMessages,max_minutes:maxMinutes,public_contact_phone:publicPhone,publish_contact_phone:a.publishContactPhone===true,updated_at:iso()};
   try{
    const result=await db(c,"nx_personal_assistants?on_conflict=owner_id",{method:"POST",body:row,prefer:"resolution=merge-duplicates,return=representation"});
    return json(200,{assistant:result?.[0]});
   }catch(error){if(/23505|duplicate|unique/i.test(error.message))return json(409,{error:"Link already in use"});throw error}
  }
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

  if(action==="save_appointment"){
   const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
   const leadId=str(data.leadId,40),employeeId=str(data.employeeId,40),appointmentId=str(data.id,40);
   const status=str(data.status,30)||"requested",notes=str(data.notes,1000);
   if(!uuid.test(leadId)||(employeeId&&!uuid.test(employeeId))||(appointmentId&&!uuid.test(appointmentId)))return json(400,{error:"Lead or appointment ID is invalid"});
   if(!["requested","confirmed"].includes(status))return json(400,{error:"Choose requested or confirmed"});
   if(typeof data.startAt!=="string"||!/(Z|[+-]\d{2}:\d{2})$/i.test(data.startAt))return json(400,{error:"Select a date and time with timezone"});
   const start=new Date(data.startAt),duration=Number(data.durationMinutes);
   if(!Number.isFinite(start.getTime())||!Number.isInteger(duration)||duration<15||duration>480)return json(400,{error:"Choose a valid date and 15–480 minutes"});
   const end=new Date(start.getTime()+duration*60000);
   if(start.getTime()<Date.now()-366*86400000||start.getTime()>Date.now()+730*86400000)return json(400,{error:"Date is outside the supported scheduling range"});
   const leads=await db(c,"nx_leads?id=eq."+encodeURIComponent(leadId)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,customer_name,customer_phone,customer_email,employee_id");
   const lead=leads?.[0];if(!lead)return json(404,{error:"Lead does not belong to this business"});
   if(employeeId){
    const staff=await db(c,"nx_employees?id=eq."+encodeURIComponent(employeeId)+"&store_id=eq."+encodeURIComponent(store.id)+"&archived=eq.false&enabled=eq.true&select=id");
    if(!staff.length)return json(400,{error:"Employee unavailable or belongs to another business"});
   }
   const existing=await db(c,"nx_appointments?store_id=eq."+encodeURIComponent(store.id)+"&lead_id=eq."+encodeURIComponent(leadId)+"&select=id");
   if(existing.length&&existing[0].id!==appointmentId)return json(409,{error:"This lead already has an appointment. Open it to reschedule."});
   if(appointmentId&&!existing.some(a=>a.id===appointmentId))return json(404,{error:"Appointment not found for this lead"});
   const overlaps=await db(c,"nx_appointments?store_id=eq."+encodeURIComponent(store.id)+"&status=in.(requested,confirmed)&start_at=lt."+encodeURIComponent(end.toISOString())+"&end_at=gt."+encodeURIComponent(start.toISOString())+"&select=id,employee_id,staff_id");
   if(overlaps.some(a=>a.id!==appointmentId&&(employeeId?a.employee_id===employeeId:!a.employee_id&&!a.staff_id)))return json(409,{error:"This employee already has a booking at that time. Choose another slot."});
   const row={lead_id:leadId,employee_id:employeeId||null,start_at:start.toISOString(),end_at:end.toISOString(),notes,status,updated_at:iso()};
   let result;
   if(appointmentId){
    const rows=await db(c,"nx_appointments?id=eq."+encodeURIComponent(appointmentId)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:row,prefer:"return=representation"});
    result=rows?.[0];
   }else{
    const rows=await db(c,"nx_appointments",{method:"POST",body:{...row,store_id:store.id,customer_name:lead.customer_name,customer_phone:lead.customer_phone||"",customer_email:lead.customer_email||""},prefer:"return=representation"});
    result=rows?.[0];
   }
   return json(200,{appointment:result});
  }
  if(action==="appointment_status"){
   const id=str(data.id,40),status=str(data.status,30);
   if(!/^[0-9a-f-]{36}$/i.test(id)||!["requested","confirmed","cancelled","completed","no_show"].includes(status))return json(400,{error:"Invalid appointment status"});
   const rows=await db(c,"nx_appointments?id=eq."+encodeURIComponent(id)+"&store_id=eq."+encodeURIComponent(store.id)+"&select=id,employee_id,staff_id,start_at,end_at");
   const item=rows?.[0];if(!item)return json(404,{error:"Appointment not found"});
   if(["requested","confirmed"].includes(status)){
    const clashes=await db(c,"nx_appointments?store_id=eq."+encodeURIComponent(store.id)+"&status=in.(requested,confirmed)&start_at=lt."+encodeURIComponent(item.end_at)+"&end_at=gt."+encodeURIComponent(item.start_at)+"&select=id,employee_id,staff_id");
    if(clashes.some(a=>a.id!==id&&(item.employee_id?a.employee_id===item.employee_id:item.staff_id?a.staff_id===item.staff_id:!a.employee_id&&!a.staff_id)))return json(409,{error:"Time slot unavailable; please reschedule."});
   }
   const changed=await db(c,"nx_appointments?id=eq."+encodeURIComponent(id)+"&store_id=eq."+encodeURIComponent(store.id),{method:"PATCH",body:{status,updated_at:iso()},prefer:"return=representation"});
   return json(200,{appointment:changed?.[0]});
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
  if(["cancel_subscription","delete_account"].includes(String((()=>{try{return JSON.parse(event.body||"{}").action}catch{return""}})())))return json(err.status||503,{error:[400,403,409].includes(err.status)?err.message:"Account operation could not be completed. No additional action was taken."});
  return safeError(err);
 }
}