// Adapts existing Netlify-style handlers to Vercel Node.js and Web Request runtimes.
export async function adapt(request,handler,nodeResponse){
 const webRequest=typeof request.text==="function"&&typeof request.headers?.entries==="function";
 const url=new URL(request.url,"https://vercel.internal");
 const headers=webRequest?Object.fromEntries(request.headers.entries()):Object.fromEntries(Object.entries(request.headers||{}).map(([key,value])=>[key.toLowerCase(),Array.isArray(value)?value.join(", "):String(value??"")]));
 const write=(status,headers,payload)=>{
  if(nodeResponse){nodeResponse.writeHead(status,Object.fromEntries(headers.entries()));nodeResponse.end(payload);return}
  return new Response(payload,{status,headers});
 };
 try{
  let body;
  if(!["GET","HEAD"].includes(request.method)){
   if(webRequest)body=await request.text();
   else if(request.body!==undefined)body=typeof request.body==="string"?request.body:JSON.stringify(request.body);
   else{const chunks=[];for await(const chunk of request)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));body=Buffer.concat(chunks).toString("utf8")}
  }
  const event={httpMethod:request.method,path:url.pathname,rawUrl:request.url,headers,body,isBase64Encoded:false,queryStringParameters:Object.fromEntries(url.searchParams),multiValueQueryStringParameters:Object.fromEntries([...new Set(url.searchParams.keys())].map(k=>[k,url.searchParams.getAll(k)]))};
  const result=await handler(event);
  if(result instanceof Response){
   if(!nodeResponse)return result;
   return write(result.status,new Headers(result.headers),Buffer.from(await result.arrayBuffer()));
  }
  if(!result||typeof result.statusCode!=="number")throw new Error("Unrecognized handler response");
  const h=new Headers(result.headers||{});
  if(!h.has("Cache-Control"))h.set("Cache-Control","no-store");
  if(!h.has("X-Content-Type-Options"))h.set("X-Content-Type-Options","nosniff");
  const payload=result.isBase64Encoded?Buffer.from(result.body||"","base64"):result.body??"";
  return write(result.statusCode,h,payload);
 }catch(e){
  console.error("NexusSales Vercel adapter:",String(e?.message||e).slice(0,150));
  return write(503,new Headers({"Content-Type":"application/json","Cache-Control":"no-store"}),JSON.stringify({error:"Service temporarily unavailable"}));
 }
}
