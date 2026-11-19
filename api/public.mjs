// Four public-facing endpoints share a single Vercel Function to stay within Hobby's
// 12-function deployment limit. All four retain their original access checks.
import{adapt}from"../vercel/lib/adapter.mjs";
import{handler as demoChat}from"../netlify/functions/demo-chat.mjs";
import{handler as publicConfig}from"../netlify/functions/public-config.mjs";
import{handler as publicStore}from"../netlify/functions/public-store.mjs";
import{handler as widgetConfig}from"../netlify/functions/widget-config.mjs";
import{handler as assistantPage}from"../netlify/functions/assistant-page.mjs";
const handlers=Object.freeze({
 "demo-chat":demoChat,
 "public-config":publicConfig,
 "public-store":publicStore,
 "widget-config":widgetConfig,
 "assistant-page":assistantPage
});
export default async function handler(request,response){
 const url=new URL(request.url,"https://vercel.internal");
 // Explicit allowlist. Never dynamic-import arbitrary tenant/user-supplied modules.
 const route=url.searchParams.get("route")||url.pathname.split("/").pop();
 const delegated=Object.hasOwn(handlers,route)?handlers[route]:null;
 if(!delegated){
  if(response){response.writeHead(404,{"Content-Type":"application/json"});response.end(JSON.stringify({error:"Unknown endpoint"}));return}
  return Response.json({error:"Unknown endpoint"},{status:404});
 }
 return adapt(request,delegated,response);
}
