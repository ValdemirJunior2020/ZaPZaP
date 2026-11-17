import{executeOnce}from"../lib/whatsapp-delivery.mjs";
// Netlify scheduled functions are not publicly callable by URL.
export default async function handler(){
 try{
  // Process a single job within Netlify's 30-second scheduled execution limit.
  const result=await executeOnce();
  console.info("WhatsApp retry worker",JSON.stringify(result));
  return new Response(null,{status:204});
 }catch(e){
  console.error("WhatsApp worker unavailable:",e.message);
  return new Response(null,{status:503});
 }
}
export const config={schedule:"*/2 * * * *"};