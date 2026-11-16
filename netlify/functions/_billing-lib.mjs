// Private server-side helpers for NexusSales billing. NEVER import in browser code.
const json=(status,obj)=>({statusCode:status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},body:JSON.stringify(obj)});
const env=()=>({
 supabaseUrl:(process.env.NEXUS_SUPABASE_URL||"").replace(/\/$/,""),
 supabaseKey:process.env.NEXUS_SUPABASE_SERVICE_ROLE_KEY||"",
 clientId:process.env.PAYPAL_CLIENT_ID||"",secret:process.env.PAYPAL_CLIENT_SECRET||"",
 plan:process.env.PAYPAL_PLAN_ID||"",webhookId:process.env.PAYPAL_WEBHOOK_ID||"",
 mode:process.env.PAYPAL_MODE==="live"?"live":"sandbox"
});
const api=cfg=>cfg.mode==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";
function configReady(c){return Boolean(c.supabaseUrl&&c.supabaseKey)}
function sameOrigin(event){
 const origin=event.headers.origin||event.headers.Origin;
 const host=event.headers.host||event.headers.Host;
 if(!origin||!host)return false;
 try{return new URL(origin).protocol==="https:"&&new URL(origin).host===host}catch{return false}
}
async function authenticate(event,c){
 if(!configReady(c))throw Object.assign(new Error("Billing database unavailable"),{status:503});
 const raw=(event.headers.authorization||event.headers.Authorization||"");
 const match=/^Bearer ([-\w.]+)$/.exec(raw);
 if(!match)throw Object.assign(new Error("Sign in required"),{status:401});
 const response=await fetch(c.supabaseUrl+"/auth/v1/user",{headers:{apikey:c.supabaseKey,Authorization:"Bearer "+match[1]},signal:AbortSignal.timeout(7000)});
 if(!response.ok)throw Object.assign(new Error("Invalid login session"),{status:401});
 const user=await response.json();
 if(!/^[a-f0-9-]{36}$/i.test(user.id||""))throw Object.assign(new Error("Invalid account"),{status:401});
 return user;
}
async function db(c,path,{method="GET",body,prefer}={}){
 const response=await fetch(c.supabaseUrl+"/rest/v1/"+path,{method,headers:{apikey:c.supabaseKey,Authorization:"Bearer "+c.supabaseKey,"Content-Type":"application/json",...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
 const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{data=null}
 if(!response.ok)throw new Error("Database operation failed ("+response.status+")");
 return data;
}
async function entitlement(c,id){
 const rows=await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(id)+"&select=user_id,trial_started_at,subscription_status,paypal_subscription_id,paypal_plan_id");
 return rows?.[0]||null;
}
function access(ent){
 if(!ent)return{allowed:false,reason:"NO_ACCOUNT",trialEndsAt:null,trialHoursLeft:0};
 const end=Date.parse(ent.trial_started_at)+48*60*60*1000;
 const paid=ent.subscription_status==="ACTIVE";
 const trial=Number.isFinite(end)&&Date.now()<end;
 return{allowed:paid||trial,reason:paid?"PAID":trial?"TRIAL":"TRIAL_EXPIRED",trialEndsAt:Number.isFinite(end)?new Date(end).toISOString():null,trialHoursLeft:trial?Math.ceil((end-Date.now())/3600000):0,subscriptionStatus:ent.subscription_status,subscriptionId:ent.paypal_subscription_id||null};
}
async function paypalToken(c){
 if(!c.clientId||!c.secret)throw Object.assign(new Error("PayPal not configured"),{status:503});
 const response=await fetch(api(c)+"/v1/oauth2/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded",Authorization:"Basic "+Buffer.from(c.clientId+":"+c.secret).toString("base64")},body:"grant_type=client_credentials",signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new Error("PayPal authorization failed");
 const j=await response.json();if(!j.access_token)throw new Error("PayPal token unavailable");return j.access_token;
}
async function paypal(c,path,{method="GET",body}={}){
 const token=await paypalToken(c);
 const response=await fetch(api(c)+path,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+token,"Accept":"application/json","PayPal-Request-Id":crypto.randomUUID()},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(20000)});
 const j=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error("PayPal request failed ("+response.status+")");
 return j;
}
export{json,env,configReady,sameOrigin,authenticate,db,entitlement,access,paypal,paypalToken,api};
