import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=async file=>readFile(new URL(file,root),"utf8");

test("business WhatsApp navigation is hidden by default and isolated",async()=>{
 const html=await read("index.html");
 const js=await read("business.js");
 assert.match(html,/data-view="whatsappLink" data-whatsapp-business hidden/);
 assert.match(js,/function renderWhatsAppLink\(\)/);
 assert.match(js,/workspace\?\.whatsappLinkAllowed===true/);
 assert.match(js,/workspace\?\.personalAssistantSpecial===true/);
 assert.match(js,/\["localhost","127\.0\.0\.1"\]\.includes\(location\.hostname\)/);
 assert.match(js,/127\.0\.0\.1:8791/);
});
test("business entitlement comes from server subscription and is not based on displayed price",async()=>{
 const handler=await read("netlify/functions/owner-workspace.mjs");
 assert.match(handler,/whatsappLinkAllowed:ent\?\.subscription_status==="ACTIVE"&&ent\?\.billing_tier==="business"/);
});
test("local WhatsApp bridge allows iframe from local Nexus only",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 assert.match(bridge,/frame-ancestors http:\/\/127\.0\.0\.1:8788 http:\/\/localhost:8788/);
 assert.match(bridge,/action==="connect"/);
 assert.match(bridge,/state\.armed=false/);
});

test("local business settings sync requires authenticated account, never exposes gateway key",async()=>{
 const server=await read("server.mjs");
 const browser=await read("business.js");
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 assert.match(server,/syncWhatsAppBusiness\(req,res\)/);
 assert.match(server,/userFrom\(event,c\)/);
 assert.match(server,/ent\?\.subscription_status==="ACTIVE"/);
 assert.match(server,/ent\?\.billing_tier==="business"/);
 assert.match(server,/ownStore\(c,user\.id\)/);
 assert.match(server,/127\.0\.0\.1:8791\/api\/business/);
 assert.match(browser,/fetch\("\/api\/nexus-whatsapp-business"/);
 assert.match(bridge,/businessMessages\(state\.business\.store,state\.business\.items/);
 assert.match(bridge,/if\(!state\.business\)throw Error/);
 assert.match(bridge,/await rememberSession\(\)/);
});

test("embedded widget messages never shrink into overlapping text",async()=>{
 const html=await read("widget-chat.html");
 assert.match(html,/\.feed\{[^}]*min-height:0;[^}]*overflow-y:auto/);
 assert.match(html,/\.bubble\{[^}]*flex:0 0 auto;[^}]*min-height:max-content/);
 assert.match(html,/#feed>\.bubble\{[^}]*flex-shrink:0/);
});

test("complimentary owner has verified unlimited dashboard widget access without anonymous quota bypass",async()=>{
 const server=await read("netlify/functions/store-chat.mjs");
 const widget=await read("widget-chat.html");
 const preview=await read("netlify/functions/owner-test-chat.mjs");
 assert.match(server,/privilegedOwner=identified\.user\.id===store\.owner_id/);
 assert.match(server,/if\(!privilegedOwner\)/);
 assert.match(server,/p_limit:cap,p_minutes:minutes/);
 assert.match(server,/unlimitedOwner:privilegedOwner/);
 assert.match(widget,/sessionStorage\.getItem\("nexus_owner_v1"\)/);
 assert.match(widget,/signedOwnerToken\?\{Authorization:"Bearer "/);
 assert.match(preview,/const ownerPreview=ent\.is_complimentary===true/);
});
test("local WhatsApp connector keeps desired auto-reply state and checks every chat",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 assert.match(bridge,/autoReply:values\.NEXUS_WA_AUTO_REPLY!=="off"/);
 assert.match(bridge,/requested:false/);
 assert.match(bridge,/state\.requested && !state\.armed/);
 assert.match(bridge,/return Array\.isArray\(response\.data\)\?response\.data:\[\]/);
 assert.match(bridge,/Saved WA-AKG session is missing/);
});

test("WhatsApp reloads cached business snapshot automatically and never commits it",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 const ignore=await read(".gitignore");
 assert.match(bridge,/Stored Nexus business settings restored/);
 assert.match(bridge,/await readFile\(snapshotFile,"utf8"\)/);
 assert.match(bridge,/writeFile\(snapshotFile,JSON\.stringify\(business\)/);
 assert.match(ignore,/\.nexus-wa-business-local\.json/);
});
