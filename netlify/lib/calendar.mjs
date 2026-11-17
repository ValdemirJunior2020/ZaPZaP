import{db,json,str}from"./tenant.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isId=x=>typeof x==="string"&&uuid.test(x);
const time=x=>typeof x==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(x);
const iso=x=>typeof x==="string"&&/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d)?(?:\.\d+)?(?:Z|[+-]\d\d:\d\d)$/.test(x)&&Number.isFinite(Date.parse(x));
const safeTz=tz=>{try{new Intl.DateTimeFormat("en",{timeZone:tz}).format();return typeof tz==="string"&&tz.length<80}catch{return false}};
const selected=(items,id)=>items.find(x=>x.id===id);
const clientError=(message,status=400)=>json(status,{error:message});
export async function ownerCalendar(c,store,action,input){
 const sid=store.id;
 if(action==="calendar_settings"){
  const timezone=str(input.timezone,80);
  const notice=Number(input.noticeHours),horizon=Number(input.horizonDays);
  if(!safeTz(timezone)||!Number.isInteger(notice)||notice<0||notice>168||!Number.isInteger(horizon)||horizon<1||horizon>90)return clientError("Choose a valid timezone, notice hours (0–168) and horizon (1–90 days)");
  const settings={store_id:sid,timezone,notice_hours:notice,horizon_days:horizon,enabled:input.enabled===true,auto_confirm:input.autoConfirm===true,updated_at:new Date().toISOString()};
  if(settings.enabled){
   const [staff,services,hours]=await Promise.all([
    db(c,"nx_calendar_staff?store_id=eq."+sid+"&active=eq.true&select=id"),
    db(c,"nx_calendar_services?store_id=eq."+sid+"&active=eq.true&select=id"),
    db(c,"nx_calendar_hours?store_id=eq."+sid+"&enabled=eq.true&select=weekday")
   ]);
   if(!staff.length||!services.length||!hours.length)return clientError("Add one staff member, one service and at least one working day before enabling scheduling");
  }
  await db(c,"nx_calendar_settings?on_conflict=store_id",{method:"POST",body:settings,prefer:"resolution=merge-duplicates,return=representation"});
  return json(200,{saved:true});
 }
 if(action==="calendar_staff"||action==="calendar_service"){
  const isStaff=action==="calendar_staff",table=isStaff?"nx_calendar_staff":"nx_calendar_services";
  const name=str(input.name,isStaff?90:100);if(name.length<2)return clientError("Enter a name of at least 2 characters");
  const row={name,active:input.active!==false};
  if(!isStaff){const duration=Number(input.durationMinutes);if(![15,30,45,60,90,120].includes(duration))return clientError("Choose a supported service duration");row.duration_minutes=duration}
  const id=input.id;
  if(id!==undefined&&id!==null){
   if(!isId(id))return clientError("Invalid record");
   const rows=await db(c,table+"?id=eq."+id+"&store_id=eq."+sid,{method:"PATCH",body:row,prefer:"return=representation"});
   if(!rows?.length)return clientError("Record not found",404);
   return json(200,{record:rows[0]});
  }
  const existing=await db(c,table+"?store_id=eq."+sid+"&select=id&limit=101");
  if(existing.length>=100)return clientError("Calendar item limit reached",403);
  const rows=await db(c,table,{method:"POST",body:{...row,store_id:sid},prefer:"return=representation"});
  return json(201,{record:rows[0]});
 }
 if(action==="calendar_hours"){
  if(!Array.isArray(input.hours)||input.hours.length!==7)return clientError("Provide seven weekdays");
  const data=input.hours.map(h=>({store_id:sid,weekday:Number(h.weekday),start_time:h.startTime,end_time:h.endTime,enabled:h.enabled===true}));
  if(new Set(data.map(x=>x.weekday)).size!==7||data.some(x=>!Number.isInteger(x.weekday)||x.weekday<0||x.weekday>6||!time(x.start_time)||!time(x.end_time)||x.start_time>=x.end_time))
   return clientError("Invalid working hours");
  await db(c,"nx_calendar_hours?on_conflict=store_id,weekday",{method:"POST",body:data,prefer:"resolution=merge-duplicates,return=minimal"});
  return json(200,{saved:true});
 }
 if(action==="calendar_block"){
  if(!iso(input.startAt)||!iso(input.endAt)||Date.parse(input.endAt)<=Date.parse(input.startAt))return clientError("Provide a valid block start and end");
  if(Date.parse(input.endAt)-Date.parse(input.startAt)>14*86400000)return clientError("Block up to 14 days at once");
  const staffId=input.staffId||null;
  if(staffId){const check=await db(c,"nx_calendar_staff?store_id=eq."+sid+"&id=eq."+encodeURIComponent(staffId)+"&select=id");if(!check.length)return clientError("Staff member not found")}
  const rows=await db(c,"nx_calendar_blocks",{method:"POST",body:{store_id:sid,staff_id:staffId,start_at:input.startAt,end_at:input.endAt,reason:str(input.reason,180)},prefer:"return=representation"});
  return json(201,{block:rows[0]});
 }
 if(action==="calendar_delete_block"){
  if(!isId(input.id))return clientError("Invalid block");
  const rows=await db(c,"nx_calendar_blocks?id=eq."+input.id+"&store_id=eq."+sid,{method:"DELETE",prefer:"return=representation"});
  return rows?.length?json(200,{deleted:true}):clientError("Block not found",404);
 }
 if(action==="calendar_appointment_status"){
  if(!isId(input.id)||!["requested","confirmed","cancelled","completed","no_show"].includes(input.status))return clientError("Invalid appointment action");
  const existing=await db(c,"nx_appointments?id=eq."+input.id+"&store_id=eq."+sid+"&select=id,status,lead_id");
  const appt=existing?.[0];if(!appt)return clientError("Appointment not found",404);
  if(!["requested","confirmed"].includes(appt.status))return clientError("This appointment is closed and cannot be changed",409);
  if(!["confirmed","cancelled","completed","no_show"].includes(input.status))return clientError("Unsupported transition");
  const rows=await db(c,"nx_appointments?id=eq."+input.id+"&store_id=eq."+sid+"&status=eq."+appt.status,{method:"PATCH",body:{status:input.status,updated_at:new Date().toISOString()},prefer:"return=representation"});
  if(!rows?.length)return clientError("Appointment changed while updating; refresh",409);
  if(appt.lead_id){
   const leadStatus=input.status==="confirmed"?"Booked":input.status==="cancelled"?"Lost":input.status==="completed"?"Won":"Contacted";
   await db(c,"nx_leads?id=eq."+appt.lead_id+"&store_id=eq."+sid,{method:"PATCH",body:{status:leadStatus,updated_at:new Date().toISOString()},prefer:"return=minimal"});
  }
  return json(200,{appointment:rows[0]});
 }
 if(action==="calendar_move"){
  if(!isId(input.id)||!isId(input.staffId)||!iso(input.startAt))return clientError("Choose a valid appointment, staff member and new start");
  try{
   const moved=await db(c,"rpc/nx_calendar_move",{method:"POST",body:{p_store:sid,p_id:input.id,p_staff:input.staffId,p_start:input.startAt}});
   return moved===true?json(200,{moved:true}):clientError("New time is unavailable or appointment is closed",409);
  }catch{return clientError("New slot is unavailable. No change made.",409)}
 }
 return clientError("Unknown calendar action");
}
export async function calendarOwnerData(c,store){
 if(!store)return{settings:null,staff:[],services:[],hours:[],blocks:[],appointments:[]};
 const id=encodeURIComponent(store.id);
 const [settings,staff,services,hours,blocks,appointments]=await Promise.all([
  db(c,"nx_calendar_settings?store_id=eq."+id+"&select=*"),
  db(c,"nx_calendar_staff?store_id=eq."+id+"&select=*&order=created_at.asc&limit=100"),
  db(c,"nx_calendar_services?store_id=eq."+id+"&select=*&order=created_at.asc&limit=100"),
  db(c,"nx_calendar_hours?store_id=eq."+id+"&select=*&order=weekday.asc"),
  db(c,"nx_calendar_blocks?store_id=eq."+id+"&end_at=gte."+encodeURIComponent(new Date().toISOString())+"&select=*&order=start_at.asc&limit=150"),
  db(c,"nx_appointments?store_id=eq."+id+"&start_at=gte."+encodeURIComponent(new Date(Date.now()-30*86400000).toISOString())+"&select=*&order=start_at.asc&limit=300")
 ]);
 return{settings:settings[0]||null,staff,services,hours,blocks,appointments};
}
export async function calendarPublic(c,store,query){
 const setting=await db(c,"nx_calendar_settings?store_id=eq."+store.id+"&enabled=eq.true&select=store_id,timezone,notice_hours,horizon_days,auto_confirm");
 const config=setting?.[0];
 if(!config||!store.appointments_enabled)return{enabled:false,staff:[],services:[],slots:[]};
 const [staff,services]=await Promise.all([
  db(c,"nx_calendar_staff?store_id=eq."+store.id+"&active=eq.true&select=id,name&order=name.asc"),
  db(c,"nx_calendar_services?store_id=eq."+store.id+"&active=eq.true&select=id,name,duration_minutes&order=name.asc")
 ]);
 let slots=[];
 if(query?.day&&query?.staffId&&query?.serviceId){
  if(!/^\d{4}-\d\d-\d\d$/.test(query.day)||!isId(query.staffId)||!isId(query.serviceId))throw Object.assign(new Error("Invalid date, staff or service"),{status:400});
  if(!selected(staff,query.staffId)||!selected(services,query.serviceId))throw Object.assign(new Error("Service or staff unavailable"),{status:400});
  slots=await db(c,"rpc/nx_calendar_slots",{method:"POST",body:{p_store:store.id,p_staff:query.staffId,p_service:query.serviceId,p_day:query.day}});
  slots=(slots||[]).map(x=>x.start_at).slice(0,100);
 }
 return{enabled:true,timezone:config.timezone,autoConfirm:config.auto_confirm,staff,services,slots};
}
export async function bookPublic(c,store,p,sessionId,sourceId){
 const staffId=p.staffId,serviceId=p.serviceId,startAt=p.startAt;
 if(!isId(staffId)||!isId(serviceId)||!iso(startAt))return clientError("Choose a valid service, staff member and available time");
 try{
  const created=await db(c,"rpc/nx_calendar_book",{method:"POST",body:{
   p_store:store.id,p_staff:staffId,p_service:serviceId,p_start:startAt,
   p_name:str(p.name,100),p_email:str(p.email,180),p_phone:str(p.phone,35),
   p_notes:str(p.interest,1000),p_session:sessionId,p_source:sourceId
  }});
  return json(201,{accepted:true,reference:created?.leadId,appointmentId:created?.appointmentId,
   status:created?.status,message:created?.status==="confirmed"?"Appointment confirmed. Please keep your booking details.":"Appointment request received. The business will review and confirm."});
 }catch(e){console.error("Calendar booking rejected:",e.message);return clientError("The selected time is no longer available. Please choose another slot.",409)}
}
