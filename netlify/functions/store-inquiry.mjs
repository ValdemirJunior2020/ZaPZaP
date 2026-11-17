import{allow,clientIp}from"../lib/abuse.mjs";
import{env,json,str,parse,postOrigin,publishedStore,db}from "../lib/tenant.mjs";
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!postOrigin(event))return json(403,{error:"Origin rejected"});
 try{
  const p=parse(event,6000);
  if(p.honeypot)return json(200,{accepted:true});
  const slug=str(p.slug,50),name=str(p.name,100),email=str(p.email,180),phone=str(p.phone,35),interest=str(p.interest,1500);
  if(name.length<2||!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/).test(email)||interest.length<5)return json(400,{error:"Please provide name, email and a message"});
  const c=env();
  if(!await allow(c,"store_inquiry",clientIp(event),8,3600))return json(429,{error:"Too many requests. Please try later"});
  const found=await publishedStore(c,slug);
  if(!found)return json(404,{error:"Business not available"});
  const inserted=await db(c,"nx_leads",{method:"POST",body:{store_id:found.store.id,customer_name:name,customer_email:email,customer_phone:phone,interest,status:"New"},prefer:"return=representation"});
  if(!inserted?.[0]?.id)throw Error("Inquiry not stored");
  return json(201,{accepted:true,reference:inserted[0].id});
 }catch(e){console.error("Inquiry capture:",e.message);return json(e.status||503,{error:e.status===400?e.message:"Inquiry could not be saved. Please try again"})}
}