import test from"node:test";import assert from"node:assert/strict";import{readFile}from"node:fs/promises";
test("Calendar lives inside Leads & Chats rather than standalone navigation",async()=>{
const a=await readFile("business.js","utf8"),h=await readFile("business.html","utf8"),c=await readFile("leads-calendar.js","utf8");
assert.match(a,/id="leadCalendarPane"/);assert.match(a,/NexusCalendar\?\.activate/);assert.match(h,/leads-calendar\.js/);assert.doesNotMatch(h,/data-view="calendar"/);
assert.doesNotThrow(()=>new Function(a));assert.doesNotThrow(()=>new Function(c));
});
test("Appointments enforce same-store scoping and reject overlapping employee slots",async()=>{
const o=await readFile("netlify/functions/owner-workspace.mjs","utf8");
assert.match(o,/action==="save_appointment"/);assert.match(o,/action==="appointment_status"/);assert.match(o,/nx_appointments\?store_id=eq/);
assert.match(o,/employee_id===employeeId/);assert.match(o,/status=in\.\(requested,confirmed\)/);
});
