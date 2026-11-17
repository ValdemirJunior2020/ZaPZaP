import{env,db,json,str,publishedStore,aiReady}from "../lib/tenant.mjs";
import{allow,clientIp}from "../lib/abuse.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const slug=str(event.queryStringParameters?.slug,50);
 try{
  const c=env();
  const found=await publishedStore(c,slug);
  if(!found)return json(404,{error:"This store is not available"});
  const {store,items}=found;
  const sourceCode=str(event.queryStringParameters?.src,80);
  const sources=sourceCode?await db(c,"nx_qr_sources?store_id=eq."+encodeURIComponent(store.id)+"&code=eq."+encodeURIComponent(sourceCode)+"&enabled=eq.true&select=code,label,offering_id"):[];
  const source=sources?.[0]||null;
  // Approximate QR opens. Limit repeated scans from one client; no IP stored in QR records.
  if(source){try{
   if(await allow(c,"qr_scan",store.id+":"+source.code+":"+clientIp(event),3,3600)){
    await db(c,"rpc/nx_track_qr_scan",{method:"POST",body:{p_store_id:store.id,p_code:source.code}});
   }
  }catch(error){console.error("QR scan counter:",error.message)}}

  return json(200,{store:{slug:store.slug,name:store.name,industry:store.industry,headline:store.headline,description:store.description,hours:store.hours,agent_name:store.agent_name,color:store.color,store_image_url:store.store_image_url,chatMaxMessages:store.chat_max_messages||10,chatMaxMinutes:store.chat_max_minutes||10,appointmentsEnabled:store.appointments_enabled!==false},
   qrSource:source?{code:source.code,label:source.label,offeringId:source.offering_id}:null,
   offerings:items.map(x=>({id:x.id,name:x.name,type:x.type,description:x.description,price_label:x.price_label,status:x.status,image_url:x.image_url})),
   chatReady:aiReady()});
 }catch(e){console.error("Public store load",e.message);return json(503,{error:"Store temporarily unavailable"})}
}