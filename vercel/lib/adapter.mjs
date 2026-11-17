// NexusSales host adapter: Netlify-style handler -> Vercel Web Request/Response.
// No hosting secrets are serialized into this adapter or returned to browsers.
export async function adapt(request,handler){
 const url=new URL(request.url);
 const headers=Object.fromEntries(request.headers.entries());
 const body=["GET","HEAD"].includes(request.method)?undefined:await request.text();
 const event={
  httpMethod:request.method,
  path:url.pathname,
  rawUrl:request.url,
  headers,
  body,
  isBase64Encoded:false,
  queryStringParameters:Object.fromEntries(url.searchParams),
  multiValueQueryStringParameters:Object.fromEntries([...new Set(url.searchParams.keys())].map(k=>[k,url.searchParams.getAll(k)]))
 };
 try{
  const result=await handler(event);
  if(result instanceof Response)return result;
  if(!result||typeof result.statusCode!=="number")throw new Error("Unrecognized handler response");
  const h=new Headers(result.headers||{});
  if(!h.has("Cache-Control"))h.set("Cache-Control","no-store");
  if(!h.has("X-Content-Type-Options"))h.set("X-Content-Type-Options","nosniff");
  const payload=result.isBase64Encoded?Buffer.from(result.body||"","base64"):result.body??"";
  return new Response(payload,{status:result.statusCode,headers:h});
 }catch(e){
  console.error("NexusSales Vercel adapter:",String(e?.message||e).slice(0,150));
  return Response.json({error:"Service temporarily unavailable"},{status:503,headers:{"Cache-Control":"no-store"}});
 }
}
