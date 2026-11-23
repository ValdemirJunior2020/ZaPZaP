import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const root=new URL("../",import.meta.url);
const read=async file=>readFile(new URL(file,root),"utf8");

test("WhatsApp menu is visible for authorized owners on hosted and local dashboards",async()=>{
 const html=await read("index.html");
 const js=await read("business.js");
 assert.match(html,/data-view="whatsappLink" data-whatsapp-business hidden/);
 assert.match(js,/const whatsappAllowed=workspace\?\.whatsappLinkAllowed===true\|\|workspace\?\.personalAssistantSpecial===true/);
 assert.match(js,/el\.hidden=!whatsappAllowed/);
 assert.match(js,/if\(viewName==="whatsappLink"&&!whatsappAllowed\)viewName="overview"/);
 assert.doesNotMatch(js,/whatsappAllowed=whatsappLocal&&/);
 assert.match(js,/if\(!\["localhost","127\.0\.0\.1"\]\.includes\(location\.hostname\)\)/);
 assert.match(js,/Open local Nexus dashboard/);
 assert.match(js,/http:\/\/127\.0\.0\.1:8788\//);
 assert.match(js,/127\.0\.0\.1:8791/);
 assert.match(js,/fetch\("\/api\/nexus-whatsapp-business"/);
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

test("signed-in owner widget transcript is separate from public customer transcripts",async()=>{
 const html=await read("widget-chat.html");
 assert.match(html,/signedOwnerToken\?"nexus_widget_owner_unlimited_v2_":"nexus_widget_"/);
 assert.doesNotMatch(html,/if\(window\.top===window/);
 const server=await read("netlify/functions/store-chat.mjs");
 assert.match(server,/String\(identified\.user\.email\|\|""\)\.toLowerCase\(\)==="infojr\.83@gmail\.com"/);
 assert.match(server,/if\(!privilegedOwner && !await allow\(c,"store_chat"/);
});

test("all-customer reply scope is explicit and defaults to test-only; reconnect and history protections remain",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 const example=await read(".env.wa-local.example");
 assert.match(bridge,/mode:values\.NEXUS_WA_REPLY_MODE==="all"\?"all":"test"/);
 assert.match(bridge,/if\(!state\.requested\|\|state\.busy\)return/);
 assert.match(bridge,/approvedSender\(chat\.jid,cfg\.allow,state\.mode\)/);
 assert.match(bridge,/if\(!n\|\|state\.seen\.has\(n\.key\)\)continue/);
 assert.match(bridge,/if\(state\.seen\.size>250000\)/);
 assert.match(example,/NEXUS_WA_REPLY_MODE=test/);
});

test("WhatsApp reply mode updates from private env without any second BAT or re-link",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 assert.match(bridge,/async function refreshLocalReplyMode\(\)/);
 assert.match(bridge,/await refreshLocalReplyMode\(\)/);
 assert.match(bridge,/state\.mode=mode;cfg\.allow=allow/);
 assert.match(bridge,/state\.baseline=false;state\.seen\.clear\(\)/);
});

test("launcher and WhatsApp console do not misleadingly say replies are OFF when auto-resume is requested",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 const launcher=await read("START-LOCAL-INTEGRATIONS.ps1");
 assert.match(bridge,/AI: "\+\(state\.armed\?"ON":state\.requested\?"AUTO-RESUME PENDING":"OFF"\)/);
 assert.match(bridge,/Reply mode: /);
 assert.doesNotMatch(launcher,/Replies remain OFF by default/);
});

test("Nexus dashboard floating widget uses SAME origin so authenticated owner quota bypass is available",async()=>{
 const dashboard=await read("index.html");
 const loader=await read("widget.js");
 const iframe=await read("widget-chat.html");
 const server=await read("netlify/functions/store-chat.mjs");
 assert.match(dashboard,/<script src="\/widget\.js" data-bot-id="bot_c75284b0593d0acd0d39dd60" async><\/script>/);
 assert.doesNotMatch(dashboard,/src="https:\/\/zapzap-bot\.netlify\.app\/widget\.js"/);
 assert.match(loader,/iframe\.src=origin\+"\/widget-chat\.html\?bot="/);
 assert.match(iframe,/sessionStorage\.getItem\("nexus_owner_v1"\)/);
 assert.match(iframe,/signedOwnerToken\?\{Authorization:"Bearer "/);
 assert.match(iframe,/nexus_widget_owner_unlimited_v2_/);
 assert.match(server,/privilegedOwner=identified\.user\.id===store\.owner_id/);
 assert.match(server,/infojr\.83@gmail\.com/);
 assert.match(server,/if\(!privilegedOwner && !await allow\(c,"store_chat"/);
});


test("WhatsApp owner panel uses customer-ready copy while preserving local disclosure and technical support details",async()=>{
 const bridge=await read("scripts/wa-akg-local-bridge.mjs");
 assert.match(bridge,/<h1>WhatsApp Assistant<\/h1>/);
 assert.match(bridge,/Manage your WhatsApp connection and automatic customer replies in one place/);
 assert.match(bridge,/id="connectionBadge"/);
 assert.match(bridge,/id="replyBadge"/);
 assert.match(bridge,/id="audience"/);
 assert.match(bridge,/id="activity"/);
 assert.match(bridge,/<details><summary>Technical details \(for support\)<\/summary>/);
 assert.match(bridge,/Connected'\:'Not connected'/);
 assert.match(bridge,/All new customer messages/);
 assert.match(bridge,/Selected test contacts/);
 assert.match(bridge,/if\(connected\)el\('qr'\)\.textContent=''/);
 assert.match(bridge,/onclick="action\('arm'\)"/);
 assert.match(bridge,/onclick="action\('disarm'\)"/);
 assert.match(bridge,/currently runs on your computer and is not a hosted 24\/7 customer service integration/);
 assert.doesNotMatch(bridge,/<h1>WhatsApp · Local Test<\/h1>/);
});

test("rendered WhatsApp panel JavaScript compiles and polls status",async()=>{
 const source=await read("scripts/wa-akg-local-bridge.mjs");
 const start=source.indexOf("  const page=");
 const end=start<0?-1:start+source.slice(start).search(/;\r?\n\s*const send=/);
 assert.ok(start>=0&&end>start);
 const assignment=source.slice(start,end);
 const rendered=new Function(assignment+";return page;")();
 const script=rendered.split("<script>")[1]?.split("</script>")[0];
 assert.ok(script);
 assert.doesNotThrow(()=>new Function(script),"The rendered browser code must be valid JavaScript");
 assert.ok(script.includes("setInterval(update,4500)"));
});
