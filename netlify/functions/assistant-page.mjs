import{readFile}from"node:fs/promises";
import{handler as storeChat}from"./store-chat.mjs";
import{validHandle}from"../lib/personal-assistant.mjs";
import{renderAssistantPage}from"../lib/assistant-share-preview.mjs";
const page=readFile(new URL("../../personal-chat.html",import.meta.url),"utf8");
const text=(status,body)=>({statusCode:status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow","X-Content-Type-Options":"nosniff"},body});
export async function handler(event){
 if(event.httpMethod!=="GET"&&event.httpMethod!=="HEAD")return text(405,"Method not allowed");
 const handle=String(event.queryStringParameters?.handle||"");
 if(!validHandle(handle))return text(404,"Assistant unavailable");
 try{
  // Use the existing public assistant lookup, including enabled + entitlement checks.
  const lookup=await storeChat({httpMethod:"GET",queryStringParameters:{assistantHandle:handle}});
  if(lookup.statusCode!==200)return text(lookup.statusCode===503?503:404,"Assistant unavailable");
  const result=JSON.parse(lookup.body||"{}");
  if(!result.assistant?.name)return text(404,"Assistant unavailable");
  const html=renderAssistantPage(await page,{name:result.assistant.name,handle});
  return text(200,event.httpMethod==="HEAD"?"":html);
 }catch(error){console.error("Assistant share preview:",error.message);return text(503,"Assistant temporarily unavailable")}
}
