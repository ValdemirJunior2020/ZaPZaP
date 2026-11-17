import crypto from "node:crypto";
import{db}from"./billing.mjs";
function fingerprint(value){
 const secret=process.env.NEXUS_ABUSE_SECRET||"";
 if(secret.length<32)throw new Error("Durable abuse protection not configured");
 return crypto.createHmac("sha256",secret).update(String(value||"unknown").slice(0,250)).digest("hex");
}
async function allow(c,scope,client,limit,seconds){
 const id=fingerprint(client);
 const ok=await db(c,"rpc/nx_consume_abuse_budget",{method:"POST",body:{p_scope:scope,p_fingerprint:id,p_limit:limit,p_window_seconds:seconds}});
 return ok===true;
}
function clientIp(event){
 // Netlify-owned request metadata; do not trust arbitrary client-submitted IP headers.
 return String(event.headers?.["x-nf-client-connection-ip"]||"unknown").slice(0,80);
}
export{allow,clientIp};
