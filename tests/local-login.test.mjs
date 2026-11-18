import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
test("Existing owners see Log in by default, with sign-up still selectable",async()=>{
 const code=await readFile("business.js","utf8");
 assert.match(code,/signingUp=false/);
 assert.match(code,/Already have an account\? Log in/);
 assert.match(code,/current-password/);
 assert.match(code,/signingUp\?"\/auth\/v1\/signup":"\/auth\/v1\/token\?grant_type=password"/);
});
test("Local development server routes secure NexusSales owner API endpoints without leaking credentials",async()=>{
 const s=await readFile("server.mjs","utf8");
 const config=await readFile("netlify/functions/public-config.mjs","utf8");
 assert.match(s,/process\.loadEnvFile/);
 assert.match(s,/\.env\.local/);
 assert.match(s,/owner-workspace/);
 assert.match(s,/store-chat/);
 assert.match(s,/store-inquiry/);
 assert.match(s,/public-config/);
 assert.match(s,/localFunction\(req,res,url,localApiName\)/);
 assert.match(config,/NEXUS_SUPABASE_PUBLISHABLE_KEY/);
 assert.doesNotMatch(config,/NEXUS_SUPABASE_SECRET_KEY/);
});
test("Loopback only allowed for local dev owner-origin API requests",async()=>{
 const text=await readFile("netlify/lib/tenant.mjs","utf8");
 assert.match(text,/NEXUS_LOCAL_DEV/);
 assert.match(text,/localhost/);
 assert.match(text,/127\\.0\\.0\\.1/);
});
test("Developer secret config file remains Git ignored and excluded from static web build",async()=>{
 const ignore=await readFile(".gitignore","utf8");
 const build=await readFile("scripts/build-vercel.mjs","utf8");
 assert.match(ignore,/\.env\.\*/);
 assert.match(build,/allowlisted/);
 assert.doesNotMatch(build,/\.env\.local/);
});
