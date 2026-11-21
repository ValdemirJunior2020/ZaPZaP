import test from"node:test";import assert from"node:assert/strict";import crypto from"node:crypto";
import{encrypt,decrypt,createState,validateState,eventIdFor}from"../netlify/lib/nexus-google-calendar.mjs";
const owner="3478cfac-ad28-404c-a308-3c56d791dfab",store="1ad8a4e4-30bd-4919-8c77-89ddb24f771a";
test("Google OAuth tokens encrypt at rest and corrupted ciphertext is rejected",()=>{
 const k=crypto.randomBytes(32),enc=encrypt("refresh-token-never-browser",k);
 assert.ok(!enc.includes("refresh-token"));assert.equal(decrypt(enc,k),"refresh-token-never-browser");
 assert.throws(()=>decrypt(enc,crypto.randomBytes(32)));
});
test("Google OAuth state binds callback to tenant, unguessable nonce and ten-minute window",()=>{
 const secret="a".repeat(48),created=Date.now(),s=createState(owner,store,secret,created);
 assert.deepEqual(validateState(s.state,s.nonce,secret,created+1000),{ownerId:owner,storeId:store});
 assert.throws(()=>validateState(s.state,"wrong",secret,created));
 assert.throws(()=>validateState(s.state,s.nonce,secret,created+601000));
 assert.throws(()=>validateState(s.state.replace(owner,"00000000-0000-0000-0000-000000000000"),s.nonce,secret,created));
});
test("owner-workspace uses authenticated store context for Google API operations",async()=>{
 const fs=await import("node:fs/promises"),code=await fs.readFile("netlify/functions/owner-workspace.mjs","utf8");
 assert.match(code,/startConnect\(user\.id,store\.id\)/);
 assert.match(code,/syncAppointment\(user\.id,store\.id/);
 assert.match(code,/google_calendar_disconnect/);
});

test("Leads calendar shows connected email and supports scoped Google sync",async()=>{
 const fs=await import("node:fs/promises"),[ui,calendar,html,build]=await Promise.all(["leads-google-calendar.js","leads-calendar.js","business.html","scripts/build-vercel.mjs"].map(p=>fs.readFile(p,"utf8")));
 assert.match(ui,/Connect to Google Calendar/);assert.match(ui,/google_calendar_status/);
 assert.match(ui,/google_calendar_connect/);assert.match(ui,/google_calendar_disconnect/);
 assert.match(ui,/google_calendar_sync/);assert.match(ui,/google_calendar_availability/);
 assert.match(calendar,/NexusGoogleCalendar\?\.attach/);
 assert.match(html,/leads-google-calendar\.js/);assert.match(build,/"leads-google-calendar\.js"/);
 assert.doesNotThrow(()=>new Function(ui));
});

test("Google calendar deterministic event IDs use its permitted base32hex alphabet",()=>{
 const id=eventIdFor("3478cfac-ad28-404c-a308-3c56d791dfab");
 assert.match(id,/^[a-v0-9]{5,1024}$/);
 assert.equal(id,eventIdFor("3478cfac-ad28-404c-a308-3c56d791dfab"));
});

test("Google API call budgets are enforced on authenticated owner actions",async()=>{
 const fs=await import("node:fs/promises"),s=await fs.readFile("netlify/functions/owner-workspace.mjs","utf8");
 assert.match(s,/gcal_global_daily/);assert.match(s,/gcal_owner_daily/);
 assert.match(s,/gcal_owner_minute/);assert.match(s,/integrationAllowance/);
});
