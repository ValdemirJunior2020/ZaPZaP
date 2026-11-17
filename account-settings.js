// NexusSales account security UI. Never store the user's password or recovery token.
const byId=id=>document.getElementById(id);
const setOpen=(id,visible)=>byId(id)?.classList.toggle("hidden",!visible);
const saved=()=>{try{return JSON.parse(sessionStorage.getItem("nexus_owner_v1")||"null")}catch{return null}};
const signedToken=()=>saved()?.access_token||sessionStorage.getItem("nexus_account_access_token")||"";
let recoveryToken=null;
let recoveryActive=false;
const hash=new URLSearchParams(location.hash.slice(1));
if(hash.get("type")==="recovery"&&hash.get("access_token")){
 recoveryToken=hash.get("access_token");recoveryActive=true;
 history.replaceState(null,"",location.pathname+location.search);
 setOpen("authPanel",false);setOpen("billingPanel",false);setOpen("resetPanel",true);
}else if(new URLSearchParams(location.search).get("forgot")==="1"){
 setOpen("authPanel",true);
}
async function getConfig(){
 const r=await fetch("/api/public-config",{cache:"no-store"});if(!r.ok)throw Error("Secure account service unavailable");
 const config=await r.json();if(!config.configured)throw Error("Account configuration incomplete");return config;
}
function displayRecoveryNotice(email){
 const status=byId("authMessage");status.textContent="";
 const lead=document.createElement("span");lead.textContent="If this account exists, the recovery email was requested for ";status.append(lead);
 const address=document.createElement("strong");address.textContent=email;address.style.cssText="display:inline-block;background:#e6f8ed;border:1px solid #84d7ac;border-radius:8px;color:#08704e;padding:5px 9px;margin:5px 0";status.append(address);
 const help=document.createElement("span");help.textContent=". Check Inbox, Spam/Junk and Promotions. Open the link to create a new password.";status.append(help);
}
byId("forgotPassword").onclick=async()=>{
 const entered=byId("email").value.trim();
 const email=entered||prompt("Enter the email for your NexusSales AI account:");
 if(!email)return;
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){byId("authMessage").textContent="Enter a valid email address first";return}
 const button=byId("forgotPassword");button.disabled=true;byId("authMessage").textContent="Requesting recovery email…";
 try{
  const c=await getConfig();
  const redirect=location.origin+"/account.html?reset=1";
  const response=await fetch(c.supabaseUrl+"/auth/v1/recover?redirect_to="+encodeURIComponent(redirect),{
   method:"POST",headers:{apikey:c.publishableKey,"Content-Type":"application/json"},
   body:JSON.stringify({email}),cache:"no-store"
  });
  if(!response.ok){const j=await response.json().catch(()=>({}));throw Error(j.msg||j.message||"Could not request recovery email")}
  displayRecoveryNotice(email);
 }catch(error){byId("authMessage").textContent=error.message}
 finally{button.disabled=false}
};
byId("resetPasswordForm").onsubmit=async event=>{
 event.preventDefault();
 const newPassword=byId("newPassword").value,verify=byId("confirmPassword").value;
 const message=byId("resetMessage");
 if(newPassword!==verify){message.textContent="Passwords do not match";return}
 if(!recoveryToken){message.textContent="Recovery link missing or expired. Request another email.";return}
 const submit=event.target.querySelector("button[type=submit]");submit.disabled=true;
 try{
  const cfg=await getConfig();
  const response=await fetch(cfg.supabaseUrl+"/auth/v1/user",{method:"PUT",headers:{
   apikey:cfg.publishableKey,Authorization:"Bearer "+recoveryToken,"Content-Type":"application/json"
  },body:JSON.stringify({password:newPassword})});
  if(!response.ok)throw Error("Recovery link expired or invalid. Request another email.");
  recoveryToken=null;event.target.reset();message.textContent="Password changed successfully. Return to sign in using your new password.";
 }catch(error){message.textContent=error.message}
 finally{submit.disabled=false}
};
function showSettings(data){
 setOpen("accountSettings",Boolean(data));
 if(!data)return;
 const status=byId("cancelStatus");
 const comp=data.reason==="COMPLIMENTARY",sub=data.subscriptionId,statusValue=data.subscriptionStatus;
 byId("cancelSubscription").disabled=comp||!sub||["CANCELLED","EXPIRED"].includes(statusValue);
 status.textContent=comp?"Lifetime complimentary access: no subscription payment.":!sub?"No PayPal subscription is associated with this account.":statusValue==="CANCELLED"?"Subscription already cancelled.":"";
}
async function runAccountAction(action,fields={}){
 const t=signedToken();if(!t)throw Error("Sign in again to manage your account");
 const response=await fetch("/.netlify/functions/owner-workspace",{method:"POST",headers:{
  Authorization:"Bearer "+t,"Content-Type":"application/json"
 },body:JSON.stringify({action,...fields}),cache:"no-store"});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(body.error||"Account operation unavailable");
 return body;
}
byId("cancelSubscription").onclick=async()=>{
 if(!confirm("Cancel future PayPal subscription renewals? Your NexusSales account and data will stay. Previous charges are not refunded."))return;
 const button=byId("cancelSubscription");button.disabled=true;byId("cancelStatus").textContent="Contacting PayPal to confirm cancellation…";
 try{
  await runAccountAction("cancel_subscription");
  byId("cancelStatus").textContent="Subscription cancellation confirmed.";
  if(typeof refresh==="function")await refresh();
 }catch(error){byId("cancelStatus").textContent=error.message;button.disabled=false}
};
byId("showDelete").onclick=()=>{setOpen("deleteForm",true);byId("deleteConfirmation").focus()};
byId("deleteForm").onsubmit=async event=>{
 event.preventDefault();
 const typed=byId("deleteConfirmation").value;
 if(typed!=="DELETE MY ACCOUNT"){byId("deleteStatus").textContent="Type DELETE MY ACCOUNT exactly";return}
 const email=sessionStorage.getItem("nexus_account_email")||saved()?.email||"your account";
 if(!confirm("Permanently delete "+email+" and all NexusSales information? This cannot be undone."))return;
 const button=byId("deleteAccountButton");button.disabled=true;byId("deleteStatus").textContent="Verifying password and any PayPal subscription before deletion…";
 try{
  const result=await runAccountAction("delete_account",{confirmText:typed,password:byId("deletePassword").value});
  if(!result.deleted)throw Error("Deletion was not confirmed");
  sessionStorage.removeItem("nexus_owner_v1");
  sessionStorage.removeItem("nexus_account_access_token");
  sessionStorage.removeItem("nexus_account_email");
  location.replace("/business.html?deleted=1");
 }catch(error){byId("deleteStatus").textContent=error.message;button.disabled=false}
};
window.nexusAccountTools={showSettings,recoveryActive};
