import{env,authenticate,json}from"../lib/billing.mjs";
import{allow,clientIp}from"../lib/abuse.mjs";
function jwtPayload(raw){
 const b=raw?.split(".")[1];if(!b)return null;
 try{return JSON.parse(Buffer.from(b,"base64url").toString("utf8"))}catch{return null}
}
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const c=env();
 if(!c.supabaseUrl||!c.supabaseKey)return json(503,{error:"Administrative identity service unavailable"});
 try{
  if(!await allow(c,"admin_access",clientIp(event),30,3600))return json(429,{error:"Too many requests"});
  const user=await authenticate(event,c); // Supabase validates the access token signature and session.
  const token=(event.headers.authorization||event.headers.Authorization||"").replace(/^Bearer /,"");
  const claims=jwtPayload(token);
  if(claims?.sub!==user.id||claims?.aal!=="aal2"||user.app_metadata?.role!=="super_admin")
   return json(403,{authenticated:false,error:"Verified administrator identity and MFA required"});
  // Admin-only API operations must repeat this verified check; frontend state is never authorization.
  return json(200,{authenticated:true,adminId:user.id});
 }catch(e){
  return json(e.status===401?401:503,{authenticated:false,error:e.status===401?"Sign in required":"Administrative access unavailable"});
 }
}
