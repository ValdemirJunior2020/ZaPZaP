import{json,sameOrigin}from"../lib/billing.mjs";
// New PayPal business pricing consists of a base subscription and optional per-employee/widget add-ons.
// PayPal button-factory snippets create independent subscriptions and are NOT safe for atomic checkout.
// This endpoint is intentionally locked until authenticated combined recurring billing and verified webhooks are implemented.
export async function handler(event){
 if(event.httpMethod!=="POST")return json(405,{error:"Method not allowed"});
 if(!sameOrigin(event))return json(403,{error:"Request origin rejected"});
 return json(503,{error:"New $499 business checkout is being configured. No subscription or payment has been initiated."});
}
