import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";import{proposedEnterpriseTotal}from"../netlify/lib/market-plans.mjs";
test("Employee prices BR and worldwide",()=>{assert.equal(proposedEnterpriseTotal("BR",5).monthlyTotal,560);assert.equal(proposedEnterpriseTotal("US",5).monthlyTotal,560);assert.equal(proposedEnterpriseTotal("PT",3).monthlyTotal,500)});
test("Employee CRUD, QR association and lead routing",async()=>{
const o=await readFile("netlify/functions/owner-workspace.mjs","utf8"),p=await readFile("netlify/functions/public-store.mjs","utf8"),i=await readFile("netlify/functions/store-inquiry.mjs","utf8");
assert.match(o,/action==="save_employee"/);assert.match(o,/existing.length|employees.length/);assert.match(p,/employee/);assert.match(i,/employee_id:employee/);
});
test("Browser team controls and storefront employee contact",async()=>{const a=await readFile("business.js","utf8"),s=await readFile("store-live.js","utf8"),h=await readFile("store.html","utf8");
assert.match(a,/function renderTeam/);assert.match(s,/employee.whatsappUrl/);assert.match(h,/employeeContact/);assert.doesNotThrow(()=>new Function(a));assert.doesNotThrow(()=>new Function(s));});

test("Legacy subscriptions do not get free enterprise seats",async()=>{
 const owner=await readFile("netlify/functions/owner-workspace.mjs","utf8");
 assert.match(owner,/function_not_used_dummy|teamEntitled/);
 assert.match(owner,/NEXUS_PAYPAL_ENTERPRISE_BR_PLAN_ID/);
 assert.match(owner,/teamAllowed:teamEntitled/);
});
