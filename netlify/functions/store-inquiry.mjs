import{JUNIOR_OWNER_ID,JUNIOR_EXPERIENCE}from"../lib/junior-assistant.mjs";
import{allow,clientIp}from"../lib/abuse.mjs";
import{env,json,str,parse,postOrigin,publishedStore,db}from"../lib/tenant.mjs";
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 try{
  const p=parse(event,6000);
  if(p.honeypot)return json(200,{accepted:true});
  let slug=str(p.slug,50);const juniorMode=p.experience===JUNIOR_EXPERIENCE;
  const name=str(p.name,100),email=str(p.email,180),phone=str(p.phone,35),interest=str(p.interest,1500);
  const emailValid=/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const phoneValid=phone.replace(/\D/g,"").length>=7;
  if(name.length<2||(!emailValid&&!phoneValid)||interest.length<5||email&&!emailValid||phone&&!phoneValid)
    return json(400,{error:"Enter your name, a valid email or phone number, and a message"});
  if(p.sessionId&&!uuid.test(p.sessionId))return json(400,{error:"Invalid conversation"});
  const kind=juniorMode?"information":["information","appointment","callback","quote"].includes(p.requestType)?p.requestType:"information";
  const preferred=str(p.preferredTime,120);
  const c=env();
  if(!await allow(c,"store_inquiry",clientIp(event),8,3600))return json(429,{error:"Too many requests. Please try later"});
  if(juniorMode){
   const owned=await db(c,"nx_stores?owner_id=eq."+JUNIOR_OWNER_ID+"&published=eq.true&select=slug");
   if(!owned?.[0])return json(404,{error:"Personal assistant unavailable"});
   slug=owned[0].slug;
  }
  const found=await publishedStore(c,slug);
  if(!found)return json(404,{error:"Business not available"});
  if(juniorMode&&(found.store.owner_id!==JUNIOR_OWNER_ID||found.ent?.is_complimentary!==true))return json(403,{error:"Assistant unavailable"});
  if(kind==="appointment"&&found.store.appointments_enabled===false)return json(400,{error:"Appointment requests are not enabled for this business"});
  let sessionId=null,sourceId=null;
  if(p.sessionId){
   const sessions=await db(c,"nx_chat_sessions?id=eq."+encodeURIComponent(p.sessionId)+"&store_id=eq."+encodeURIComponent(found.store.id)+"&select=id,source_id");
   if(!sessions?.length)return json(400,{error:"Conversation not found"});
   sessionId=sessions[0].id;sourceId=sessions[0].source_id;
  }else if(p.sourceCode){
   const sources=await db(c,"nx_qr_sources?code=eq."+encodeURIComponent(str(p.sourceCode,80))+"&store_id=eq."+encodeURIComponent(found.store.id)+"&enabled=eq.true&select=id");
   sourceId=sources?.[0]?.id||null;
  }
  const rows=await db(c,"nx_leads",{method:"POST",body:{
   store_id:found.store.id,session_id:sessionId,source_id:sourceId,
   customer_name:name,customer_email:email,customer_phone:phone,interest:juniorMode?"Hope personal assistant: "+interest:interest,status:kind==="appointment"?"Appointment Requested":"New",
   request_type:kind,preferred_time:kind==="appointment"?preferred:""
  },prefer:"return=representation"});
  if(!rows?.[0]?.id)throw Error("Inquiry not stored");
  return json(201,{accepted:true,reference:rows[0].id});
 }catch(e){console.error("Inquiry capture:",e.message);return json(e.status||503,{error:e.status===400?e.message:"Inquiry could not be saved. Please try again"})}
}
