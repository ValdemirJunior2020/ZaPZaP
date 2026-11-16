import{env,json,str,publishedStore,aiReady}from "../lib/tenant.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const slug=str(event.queryStringParameters?.slug,50);
 try{
  const found=await publishedStore(env(),slug);
  if(!found)return json(404,{error:"This store is not available"});
  const {store,items,ent}=found;
  return json(200,{store:{slug:store.slug,name:store.name,industry:store.industry,headline:store.headline,description:store.description,hours:store.hours,agent_name:store.agent_name,color:store.color,store_image_url:store.store_image_url},
   offerings:items.map(x=>({id:x.id,name:x.name,type:x.type,description:x.description,price_label:x.price_label,status:x.status,image_url:x.image_url})),
   chatReady:aiReady()});
 }catch(e){console.error("Public store load",e.message);return json(503,{error:"Store temporarily unavailable"})}
}