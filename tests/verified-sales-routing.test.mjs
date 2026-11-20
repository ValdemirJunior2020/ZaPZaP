import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {verifiedSalesAnswer,verifiedSalesInstructions,NEXUS_SALES_URL,NEXUS_PRICE_URL} from "../netlify/lib/verified-sales-routing.mjs";
const read=p=>readFile(new URL("../"+p,import.meta.url),"utf8");
const phone="+15551234567";

test("purchase and payment requests route to actual signup and explain that checkout is disabled",()=>{
 for(const message of ["how do i pay you?","where can i buy?","I want to subscribe","onde posso pagar?","quero comprar","¿Dónde puedo pagar?"]){
  const reply=verifiedSalesAnswer(message,null);
  assert.ok(reply,message);
  assert.ok(reply.includes(NEXUS_SALES_URL),message);
  assert.ok(reply.includes(NEXUS_PRICE_URL),message);
  assert.match(reply,/not enabled|não está habilitado|no está habilitado/);
 }
});
test("only explicitly enabled valid phone can be shared",()=>{
 assert.match(verifiedSalesAnswer("give me the number to call",phone),/\+15551234567/);
 assert.match(verifiedSalesAnswer("qual seu telefone?",phone),/\+15551234567/);
 assert.match(verifiedSalesAnswer("give me the number to call",null),/not been enabled/);
 assert.match(verifiedSalesAnswer("give me the number to call","15551234567"),/not been enabled/);
 assert.equal(verifiedSalesAnswer("How much does the Business plan cost?",phone),null);
 assert.doesNotMatch(verifiedSalesInstructions(null),/\+15551234567/);
});
test("owner preview and public chat always use server-scoped verified contact settings",async()=>{
 const [owner,publicChat,frontend,helper]=await Promise.all(["netlify/functions/owner-test-chat.mjs","netlify/functions/store-chat.mjs","business.js","netlify/lib/verified-sales-routing.mjs"].map(read));
 assert.match(owner,/publicSalesContact\(c,store\)/);
 assert.match(owner,/verifiedSalesAnswer\(message,contactPhone\)/);
 assert.match(publicChat,/publicSalesContact\(c,store\)/);
 assert.match(publicChat,/verifiedReply\|\|ai\.text/);
 assert.match(publicChat,/verifiedReply\?"verified_business":"ai"/);
 assert.match(frontend,/"verified_business"/);
 assert.match(helper,/publish_contact_phone=eq\.true/);
 assert.match(helper,/owner_id=eq\./);
 assert.match(helper,/store_id=eq\./);
 assert.match(helper,/\^\\\+\[1-9\]/);
});
