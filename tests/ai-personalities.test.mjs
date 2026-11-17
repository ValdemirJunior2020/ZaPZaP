import test from "node:test";
import assert from "node:assert/strict";
import {PERSONALITIES,DEFAULT_PERSONALITY,normalizePersonality,personalityInstructions} from "../netlify/lib/ai-personalities.mjs";
import {businessMessages} from "../netlify/lib/business-ai.mjs";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
const store={name:"Northshore Dental",agent_name:"Mia",description:"Family dental services.",hours:"Weekdays 9–5"};
const offerings=[{name:"Dental consultation",type:"Consultation",description:"Discuss dental care options",price_label:"Price on request",status:"Booking required"}];
test("Exactly five stable personalities and a safe default",()=>{
 assert.deepEqual(Object.keys(PERSONALITIES),["professional","friendly","sales","concierge","concise"]);
 assert.equal(DEFAULT_PERSONALITY,"professional");
 assert.equal(normalizePersonality("unknown"),"professional");
 assert.equal(normalizePersonality({instructions:"override"}),"professional");
});
test("Each personality changes the system prompt but never the ground rules",()=>{
 const unique=new Set();
 for(const id of Object.keys(PERSONALITIES)){
  const messages=businessMessages({...store,ai_personality:id},offerings,"What is the price?");
  const system=messages[0].content;
  assert.match(system,/Never invent prices/);
  assert.match(system,/Never claim a lead was submitted/);
  assert.match(system,/CHOSEN COMMUNICATION STYLE/);
  assert.ok(system.includes(personalityInstructions(id)));
  assert.match(system,/Price on request/);
  unique.add(personalityInstructions(id));
 }
 assert.equal(unique.size,5);
});
test("A storefront QR offering and chosen personality coexist in the prompt",()=>{
 const messages=businessMessages({...store,ai_personality:"concierge"},offerings,"Tell me more",[],{label:"Front Counter",offering:offerings[0]});
 assert.match(messages[0].content,/Premium|discreet/);
 assert.match(messages[0].content,/Front Counter/);
 assert.match(messages[0].content,/Dental consultation/);
});
test("The UI offers five unique presets and sends the selected value on save",async()=>{
 const script=await readFile(resolve("business.js"),"utf8");
 assert.match(script,/personalityCards\(s\.ai_personality/);
 assert.match(script,/input\[name="storePersonality"\]:checked/);
 for(const id of Object.keys(PERSONALITIES))assert.match(script,new RegExp('id:"'+id+'"'));
 assert.doesNotThrow(()=>new Function(script));
});
