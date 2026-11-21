import{finishConnect,clearCookie}from"../lib/nexus-google-calendar.mjs";
export async function handler(event){
 if(event.httpMethod!=="GET")return{statusCode:405,body:"Method not allowed"};
 const secure=!process.env.NEXUS_LOCAL_DEV;
 try{
  await finishConnect(event);
  return{statusCode:303,headers:{Location:"/business.html?calendar=connected", "Set-Cookie":clearCookie(secure),"Cache-Control":"no-store"},body:""};
 }catch(error){
  // Never reflect Google errors, credentials, tokens or query strings in URLs.
  return{statusCode:303,headers:{Location:"/business.html?calendar=error","Set-Cookie":clearCookie(secure),"Cache-Control":"no-store"},body:""};
 }
}
