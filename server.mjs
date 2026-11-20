import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
const root=path.dirname(fileURLToPath(import.meta.url)),port=Number(process.env.PORT||8788);
// Local development only. .env.local is gitignored; never expose server keys to browsers.
try{process.loadEnvFile(path.join(root,".env.local"))}catch(error){if(error?.code!=="ENOENT")console.warn("Local config:",error.message)}
process.env.NEXUS_LOCAL_DEV="true";
const localHandlers=Object.freeze({
 "public-config":"./netlify/functions/public-config.mjs",
 "owner-workspace":"./netlify/functions/owner-workspace.mjs",
 "store-chat":"./netlify/functions/store-chat.mjs",
 "store-inquiry":"./netlify/functions/store-inquiry.mjs",
 "owner-test-chat":"./netlify/functions/owner-test-chat.mjs",
 "public-store":"./netlify/functions/public-store.mjs",
 "widget-config":"./netlify/functions/widget-config.mjs",
 "assistant-page":"./netlify/functions/assistant-page.mjs"
});
async function localFunction(req,res,url,name){
 const modulePath=localHandlers[name];if(!modulePath)return result(res,404,{error:"Unknown local API route"});
 if(!["GET","POST"].includes(req.method))return result(res,405,{error:"Method not allowed"});
 const {handler}=await import(modulePath);
 let body;
 if(req.method==="POST")body=await payload(req);
 const event={httpMethod:req.method,path:url.pathname,rawUrl:url.href,body,headers:req.headers,queryStringParameters:Object.fromEntries(url.searchParams)};
 const answer=await handler(event);
 if(!answer||typeof answer.statusCode!=="number")return result(res,503,{error:"API returned an invalid response"});
 res.writeHead(answer.statusCode,{"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",...(answer.headers||{})});
 res.end(answer.body||"");
}

const TYPES={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.toml':'text/plain','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.ico':'image/x-icon','.avif':'image/avif','.woff':'font/woff','.woff2':'font/woff2'};
const language=(s)=>/[ãõçáéíóúâêôà]/i.test(s)||/\b(olá|oi|vocês|preço|quanto custa|obrigad[oa]|agendar|carro|hoje)\b/i.test(s)?'pt':/[¿¡ñ]/.test(s)||/\b(hola|precio|gracias|quiero|cita|mañana|cuánto|tienen|necesito)\b/i.test(s)?'es':'en';
const fallback={en:"Thanks for messaging us! We're helping other customers right now. Someone will be with you shortly.",es:"¡Gracias por escribirnos! Estamos atendiendo a otros clientes. En breve estaremos contigo.",pt:"Obrigado por entrar em contato! Estamos atendendo outros clientes. Em breve vamos falar com você."};
const result=(res,status,obj)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(obj))};
let active=0;const hits=new Map();
function limit(ip){const now=Date.now(),recent=(hits.get(ip)||[]).filter(t=>now-t<60000);recent.push(now);hits.set(ip,recent);if(hits.size>3000){for(const [key,val] of hits){if(!val.length||now-val.at(-1)>60000)hits.delete(key)}}return recent.length<=20}
async function payload(req){let bytes=0,chunks=[];for await(const ch of req){bytes+=ch.length;if(bytes>16000)throw new Error('Request too large');chunks.push(ch)}return Buffer.concat(chunks).toString('utf8')}
function safeSettings(s){const trim=(x,n=1000)=>String(x||'').slice(0,n);return{business:trim(s.business,100),agent:trim(s.agent,80),description:trim(s.description),products:trim(s.products,3000),hours:trim(s.hours,100),tone:trim(s.tone,60),humanPhone:trim(s.humanPhone,35),sharePhone:s.sharePhone===true,allowCallbacks:s.allowCallbacks===true}}
async function generate(message,settings,history){
const system='You are '+settings.agent+', a business-specific sales and support assistant for '+settings.business+'. Be truthful, polite, concise, and reply in the customer\'s language. Never invent prices, appointments, discounts or availability. Ask one useful question at a time. You can explain products or collect leads but do not pretend a booking or payment succeeded. If uncertain, offer human assistance. Business: '+settings.description+'\nProducts: '+settings.products+'\nHours: '+settings.hours+'\nTone: '+settings.tone+'\nHuman contact: '+(settings.sharePhone&&/^\\+?[\\d\\s().-]{7,35}$/.test(settings.humanPhone)?settings.humanPhone:'Do not share a direct phone number')+'\nCallbacks: '+(settings.allowCallbacks?'Ask for name and callback number, but never claim the callback is scheduled.':'Do not offer callbacks.')+'\nThe virtual demo number is never a dialable phone number.';
const inventory=Array.isArray(settings.catalog)?settings.catalog:[];
const verified=inventory.map(p=>({name:String(p.name||'').slice(0,130),type:String(p.type||'').slice(0,40),price:String(p.price||'').slice(0,70),description:String(p.description||'').slice(0,300),availability:String(p.availability||'').slice(0,50)}));
const groundedSystem=system+'\\nCATALOG OF BUSINESS-ENTERED OFFERINGS (not independently verified): '+JSON.stringify(verified).slice(0,10000)+'\\nCritical rules: Never assert a specific item/service is unavailable just because it is not listed. If not listed, say availability and pricing are unconfirmed and offer to request a quote or human follow-up. For items listed, relay the listed price and status without inventing details. Services, appointments, hourly work, subscriptions and quote-based offerings are all supported. Do not imply a real appointment or callback was booked. Never mention internal infrastructure.';
const messages=[{role:'system',content:groundedSystem},...history.filter(x=>x.role==='user'||x.role==='bot').slice(-8).map(x=>({role:x.role==='bot'?'assistant':'user',content:String(x.text||'').slice(0,1000)})),{role:'user',content:message}];
const base=(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434').replace(/\/$/,'')+'/api/chat';
const headers={'Content-Type':'application/json'};
if(process.env.OLLAMA_AUTH_TOKEN)headers.Authorization='Bearer '+process.env.OLLAMA_AUTH_TOKEN;
const body={model:process.env.OLLAMA_MODEL||'qwen3:8b',messages,stream:false,think:false,options:{temperature:0.3,num_predict:280}};
const res=await fetch(base,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});
if(!res.ok)throw new Error('Model API returned HTTP '+res.status);
const data=await res.json();
const answer=data?.message?.content;
if(typeof answer==='string'&&answer.trim())return answer.trim().slice(0,2200);

// A Qwen chat response can be successful but contain only thinking tokens.
console.warn('Empty Ollama chat content; retrying without thinking. Thinking length:',String(data?.message?.thinking||'').length);
const prompt=groundedSystem+'\n\n'+history.slice(-4).map(x=>(x.role==='user'?'Customer: ':'Assistant: ')+String(x.text||'').slice(0,500)).join('\n')+'\nCustomer: '+message+'\nAssistant: /no_think\n';
const retry=await fetch((process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434').replace(/\/$/,'')+'/api/generate',{
 method:'POST',headers,body:JSON.stringify({model:process.env.OLLAMA_MODEL||'qwen3:8b',prompt,stream:false,think:false,options:{temperature:0.3,num_predict:450}}),signal:AbortSignal.timeout(90000)
});
if(!retry.ok)throw new Error('Ollama retry HTTP '+retry.status);
const retried=await retry.json();
let answer2=typeof retried.response==='string'?retried.response.trim():'';
if(answer2.startsWith('<think>')&&answer2.includes('</think>'))answer2=answer2.split('</think>').slice(1).join('</think>').trim();
if(!answer2)throw new Error('Model returned no user-visible text');
return answer2.slice(0,2200);
}
const server=http.createServer(async(req,res)=>{try{
const url=new URL(req.url,'http://localhost');
if(url.pathname==='/api/health'){
 const enabled=process.env.ENABLE_LOCAL_AI==='true'||process.env.ENABLE_PUBLIC_AI_DEMO==='true';
 const provider='ollama';
 let aiReady=false, error=null;
 try{
 const api=(process.env.OLLAMA_BASE_URL||'http://127.0.0.1:11434')+'/api/tags';
 const response=await fetch(api,{signal:AbortSignal.timeout(2500)});
 if(response.ok){const data=await response.json();const selected=process.env.OLLAMA_MODEL||'qwen3:8b';aiReady=(data.models||[]).some(m=>m.name===selected||m.name.startsWith(selected+':'));if(!aiReady)error='Model '+selected+' is not installed';}
 else error='Ollama API returned '+response.status;
 }catch{error='Ollama is not responding on this computer';}
 return result(res,200,{ok:true,mode:'local',aiProvider:provider,enabled,aiReady:aiReady&&enabled,model:process.env.OLLAMA_MODEL||'qwen3:8b',error});
}
if(url.pathname==='/api/chat'&&req.method==='POST'){const ip=req.socket.remoteAddress||'unknown';let j;try{j=JSON.parse(await payload(req))}catch{return result(res,400,{error:'Invalid JSON or oversized request'})}const message=String(j.message||'').trim().slice(0,1000);if(!message)return result(res,400,{error:'Message required'});const wait=fallback[language(message)];if(!limit(ip)||active>=Math.max(1,Math.min(4,Number(process.env.MAX_AI_CONCURRENCY||2))))return result(res,200,{reply:wait,busy:true});if(process.env.ENABLE_LOCAL_AI!=='true'&&process.env.ENABLE_PUBLIC_AI_DEMO!=='true')return result(res,503,{error:'AI demo disabled',reply:wait});const settings=safeSettings(j.settings&&typeof j.settings==='object'?j.settings:{});
settings.catalog=Array.isArray(j.catalog)?j.catalog.slice(0,100).map(p=>({name:String(p.name||'').slice(0,130),type:String(p.type||'').slice(0,40),price:String(p.price||'').slice(0,70),description:String(p.description||'').slice(0,300),availability:String(p.availability||'').slice(0,50)})):[];
const direct=/\b(phone|telephone|number|human|representative|call someone|telefone|n[uú]mero|atendente|falar com|tel[eé]fono|hablar con)\b/i.test(message);
if(direct&&settings.sharePhone&&/^\+?[\d\s().-]{7,35}$/.test(settings.humanPhone))return result(res,200,{reply:({en:"The business contact number is ",pt:"O telefone de contato da empresa é ",es:"El teléfono de contacto de la empresa es "})[language(message)]+settings.humanPhone});
active++;try{const answer=await generate(message,settings,Array.isArray(j.history)?j.history:[]);return result(res,200,{reply:answer,source:'ai'})}catch(e){console.warn('AI unavailable:',e.message);return result(res,503,{error:'AI temporarily unavailable',code:'AI_UNAVAILABLE'})}finally{active--}}
if(url.pathname==='/api/whatsapp/webhook'&&req.method==='GET'){if(!process.env.WHATSAPP_VERIFY_TOKEN)return result(res,503,{error:'Not configured'});if(url.searchParams.get('hub.mode')==='subscribe'&&url.searchParams.get('hub.verify_token')===process.env.WHATSAPP_VERIFY_TOKEN){res.writeHead(200,{'Content-Type':'text/plain'});return res.end(url.searchParams.get('hub.challenge')||'')}return result(res,403,{error:'Verification failed'})}
const fnMatch=url.pathname.match(/^\/\.netlify\/functions\/([a-z0-9-]+)$/);
const localApiName=fnMatch?.[1]||(url.pathname.startsWith("/api/")?url.pathname.slice(5):null);
if(localApiName&&Object.hasOwn(localHandlers,localApiName))return await localFunction(req,res,url,localApiName);
if(url.pathname.startsWith('/api/'))return result(res,501,{error:'Integration not configured; no production messaging or billing occurs in this demo'});
if(req.method!=='GET'&&req.method!=='HEAD')return result(res,405,{error:'Method not allowed'});
const assistantMatch=url.pathname.match(/^\/assistant\/([a-z][a-z0-9-]{2,31})$/);
if(assistantMatch){url.searchParams.set("handle",assistantMatch[1]);return await localFunction(req,res,url,"assistant-page")}
let pathname=decodeURIComponent(url.pathname);
// Match the Netlify/Vercel public storefront rewrite in local development.
// Preserve the original /s/:slug URL so store-live.js resolves the tenant correctly.
if(/^\/s\/[a-z0-9-]{3,50}\/?$/i.test(pathname))pathname="/store.html";
if(pathname==="/assistant")pathname="/junior.html";
else if(/^\/assistant\/[a-z][a-z0-9-]{2,31}$/.test(pathname))pathname="/personal-chat.html";
const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep))return result(res,403,{error:'Forbidden'});if(file.includes(path.sep+'.')||/\.(env|sql|md|toml)$/i.test(file))return result(res,404,{error:'Not found'});let info;try{info=await stat(file)}catch{return result(res,404,{error:'Not found'})}if(!info.isFile())return result(res,404,{error:'Not found'});const content=await readFile(file);res.writeHead(200,{'Content-Type':TYPES[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'public, max-age=120'});res.end(req.method==='HEAD'?undefined:content)
}catch(e){console.error('Request error:',e.message);if(!res.headersSent)result(res,500,{error:'Server error'})}});
const host=process.env.HOST||'127.0.0.1';
server.listen(port,host,()=>console.log('ZaPZaP demo listening at http://'+host+':'+port));
