import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {PLANNED_CATALOG} from "../netlify/lib/market-plans.mjs";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");

test("Public pricing matches business, personal and optional website chatbot",async()=>{
 const [landing,business,account]=await Promise.all(["index.html","business.html","account.html"].map(read));
 for(const html of [landing,business]){
  assert.match(html,/<strong>\$15<small>\/month<\/small><\/strong>/);
  assert.match(html,/<strong>\$499<small>\/month<\/small><\/strong>/);
  assert.match(html,/<strong>\+\$79<small>\/month<\/small><\/strong>/);
  assert.match(html,/\$578\/month/);
  assert.doesNotMatch(html,/<strong>\$149/);
  assert.doesNotMatch(html,/\$228\/month bundled/);
  assert.match(html,/WhatsApp auto-replies require a separately configured/);
 }
 assert.equal(PLANNED_CATALOG.enterpriseBaseUsd,499);
 assert.equal(PLANNED_CATALOG.personalBasicUsd,15);
 assert.equal(PLANNED_CATALOG.websiteWidgetUsd,79);
 assert.match(account,/\$499/);
 assert.match(account,/\$15/);
});

test("Netlify and Vercel publish only intended static assets",async()=>{
 const [toml,build,vercelText]=await Promise.all(["netlify.toml","scripts/build-vercel.mjs","vercel.json"].map(read));
 assert.match(toml,/publish\s*=\s*"public"/);
 assert.match(toml,/node scripts\/build-vercel\.mjs/);
 assert.doesNotMatch(toml,/publish\s*=\s*"\."/);
 assert.match(build,/const allowed=/);
 assert.doesNotMatch(build,/"\.env"/);
 const vercel=JSON.parse(vercelText);
 assert.equal(vercel.outputDirectory,"public");
 assert.ok(vercel.rewrites.some(x=>x.source==="/assistant/:handle"));
});

test("Commercial launch remains gated on billing and signed PayPal verification",async()=>{
 const [checkout,webhook,report,script]=await Promise.all(["netlify/functions/billing-checkout.mjs","netlify/functions/billing-webhook.mjs","docs/COMMERCIAL-LAUNCH-CHECKLIST.md","scripts/launch-audit.mjs"].map(read));
 assert.match(checkout,/NEXUS_BILLING_ENABLED/);
 assert.match(checkout,/validMonthlyPlan\(/);
 assert.match(checkout,/raw\.consent!==true/);
 assert.match(webhook,/verify-webhook-signature/);
 assert.match(webhook,/verification_status/);
 assert.match(report,/NOT CLEARED FOR PAID PUBLIC LAUNCH/);
 assert.match(script,/process\.exitCode=1/);
});
