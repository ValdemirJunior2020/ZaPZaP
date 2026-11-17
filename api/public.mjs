// Four public-facing endpoints share a single Vercel Function to stay within Hobby's
// 12-function deployment limit. All four retain their original access checks.
import{adapt}from"../vercel/lib/adapter.mjs";
import{handler as demoChat}from"../netlify/functions/demo-chat.mjs";
import{handler as publicConfig}from"../netlify/functions/public-config.mjs";
import{handler as publicStore}from"../netlify/functions/public-store.mjs";
import{handler as widgetConfig}from"../netlify/functions/widget-config.mjs";
const handlers=Object.freeze({
 "demo-chat":demoChat,
 "public-config":publicConfig,
 "public-store":publicStore,
 "widget-config":widgetConfig
});
export default async function handler(request){
 const url=new URL(request.url);
 // Explicit allowlist. Never dynamic-import arbitrary tenant/user-supplied modules.
 const route=url.searchParams.get("route")||url.pathname.split("/").pop();
 const delegated=Object.hasOwn(handlers,route)?handlers[route]:null;
 if(!delegated)return Response.json({error:"Unknown endpoint"},{status:404});
 return adapt(request,delegated);
}
