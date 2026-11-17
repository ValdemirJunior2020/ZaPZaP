// Account lifecycle operations. Only callable from authenticated owner-workspace.
import{env,db,json,paypal}from"./billing.mjs";

const cancelStatuses=new Set(["CANCELLED","EXPIRED"]);
const validId=/^I-[A-Z0-9]+$/i;
async function cancelPayPalSubscription(c,userId,ent){
 const id=ent?.paypal_subscription_id;
 if(!id){
  if(ent?.subscription_status==="ACTIVE")throw Object.assign(new Error("Billing record requires support review before cancellation"),{status:409});
  return {cancelled:false,reason:"NO_SUBSCRIPTION"};
 }
 if(!validId.test(id))throw Object.assign(new Error("Invalid stored PayPal subscription"),{status:503});
 if(!c.clientId||!c.secret)throw Object.assign(new Error("PayPal connection unavailable; cancellation cannot be verified"),{status:503});
 const path="/v1/billing/subscriptions/"+encodeURIComponent(id);
 let sub=await paypal(c,path);
 // Verify this exact owner and original plan; do not cancel someone else's subscription.
 if(sub.custom_id!==userId||sub.plan_id!==ent.paypal_plan_id)
  throw Object.assign(new Error("Subscription ownership could not be verified"),{status:409});
 if(!cancelStatuses.has(sub.status)){
  await paypal(c,path+"/cancel",{method:"POST",body:{reason:"Subscriber requested cancellation from NexusSales AI account settings"}});
  sub=await paypal(c,path);
  if(!cancelStatuses.has(sub.status))
   throw Object.assign(new Error("Cancellation requested but PayPal has not confirmed it yet. Try again shortly or contact support."),{status:503});
 }
 await db(c,"nx_entitlements?user_id=eq."+encodeURIComponent(userId)+"&paypal_subscription_id=eq."+encodeURIComponent(id),{
  method:"PATCH",body:{subscription_status:sub.status,updated_at:new Date().toISOString()},prefer:"return=minimal"
 });
 return {cancelled:true,status:sub.status};
}
async function cancelSubscription(c,user,ent){
 if(ent?.is_complimentary===true)return json(409,{error:"Your lifetime complimentary access has no paid subscription to cancel"});
 if(!ent?.paypal_subscription_id)return json(409,{error:"No PayPal subscription is connected to this account"});
 const result=await cancelPayPalSubscription(c,user.id,ent);
 return json(200,{success:true,...result,message:"PayPal subscription cancelled. Your NexusSales account and business data remain available under the applicable access rules."});
}
async function verifyPassword(c,user,password){
 if(typeof password!=="string"||password.length<8||password.length>256)
  throw Object.assign(new Error("Enter your account password to confirm deletion"),{status:400});
 const response=await fetch(c.supabaseUrl+"/auth/v1/token?grant_type=password",{
  method:"POST",headers:{"Content-Type":"application/json",apikey:c.supabaseKey},
  body:JSON.stringify({email:user.email,password}),signal:AbortSignal.timeout(10000)
 });
 if(!response.ok)throw Object.assign(new Error("Password verification failed. Account was not deleted."),{status:403});
 const credential=await response.json();
 if(credential.user?.id!==user.id)throw Object.assign(new Error("Account verification mismatch"),{status:403});
}
async function deleteAccount(c,user,ent,input){
 if(input.confirmText!=="DELETE MY ACCOUNT")return json(400,{error:"Type DELETE MY ACCOUNT exactly to confirm permanent deletion"});
 await verifyPassword(c,user,input.password);
 // Stop any future PayPal renewals first. If verification fails, leave all data intact.
 if(ent?.paypal_subscription_id)await cancelPayPalSubscription(c,user.id,ent);
 else if(ent?.subscription_status==="ACTIVE")return json(409,{error:"Billing status must be reviewed before this account can be deleted"});
 // Deleting the Auth identity cascades owner store, catalog, leads, QR and transcript rows.
 // Supabase admin key never leaves this backend.
 const result=await fetch(c.supabaseUrl+"/auth/v1/admin/users/"+encodeURIComponent(user.id),{
  method:"DELETE",headers:{apikey:c.supabaseKey,Authorization:"Bearer "+c.supabaseKey},
  signal:AbortSignal.timeout(15000)
 });
 if(!result.ok)throw Object.assign(new Error("Account deletion could not be completed; contact support. Any PayPal cancellation already confirmed remains in effect."),{status:503});
 return json(200,{deleted:true,message:"Account deleted. You will be signed out."});
}
export{cancelSubscription,deleteAccount};
