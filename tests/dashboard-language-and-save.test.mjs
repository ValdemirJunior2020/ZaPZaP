import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");
test("every main dashboard sidebar destination has a renderer",async()=>{
 const [html,js]=await Promise.all([read("business.html"),read("business.js")]);
 const nav=html.match(/<nav id="sideNav">([\s\S]*?)<\/nav>/)?.[1]||"";
 const buttons=[...nav.matchAll(/<button\b[^>]*data-view="([^"]+)"/g)].map(m=>m[1]);
 assert.ok(buttons.length>=9,"expected all sidebar destinations");
 const source=js.match(/const views=\{([^\n]+)\};/)?.[1]||"";
 for(const view of buttons)assert.match(source,new RegExp("(?:^|,)"+view+":"));
 assert.match(js,/nav\.addEventListener\("click"/);
});
test("language changing preserves in-progress input values",async()=>{
 const js=await read("business.js");
 assert.match(js,/snapshotActiveInputs\(\)/);
 assert.match(js,/restoreActiveInputs\(inputs\)/);
 assert.match(js,/window\.addEventListener\("nexus:language"/);
});
test("all three platform languages cover the business settings and navigation",async()=>{
 const lang=await read("nexus-language.js");
 const expressions=["SmartLink name (editable)","Professional Consultant","Save business details","Business description and policies","My Store","Leads & Chats","Choose a personality","Store cover image URL (HTTPS)"];
 for(const phrase of expressions)assert.ok(lang.includes(JSON.stringify(phrase)),phrase);
 assert.match(lang,/Sidebar buttons carry Unicode icons/);
});
test("settings writes must return a database row and a visible feedback status",async()=>{
 const [server,ui,profile]=await Promise.all([read("netlify/functions/owner-workspace.mjs"),read("business.js"),read("nexus-business-profile-ui.js")]);
 assert.match(server,/Business settings were not confirmed saved/);
 assert.match(server,/Language preference could not be verified/);
 assert.match(ui,/id="storeSaveStatus"/);
 assert.match(ui,/Saved details could not be verified/);
 assert.match(profile,/const defaultTimezone/);
 assert.match(profile,/saved\.businessProfile\?\.store_id/);
});
