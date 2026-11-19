import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProfile,hoursResult,localParts} from '../netlify/lib/nexus-business-profile.mjs';
import {parseWindow,conflicts} from '../netlify/lib/nexus-booking.mjs';
const weekly_hours=Object.fromEntries(['mon','tue','wed','thu','fri','sat','sun'].map(d=>[d,d==='sat'||d==='sun'?[]:[{open:'09:00',close:'17:00'}]]));
const profile=normalizeProfile({timezone:'America/New_York',weekly_hours,closed_dates:['2026-11-26'],categories:['Retail','Services'],booking_notice_hours:2});
test('validates week schedule and preserves bilingual-friendly categories',()=>{
 assert.equal(profile.timezone,'America/New_York');assert.deepEqual(profile.categories,['Retail','Services']);
});
test('refuses invalid timezone, malformed hours and overlaps',()=>{
 assert.throws(()=>normalizeProfile({...profile,timezone:'Fake/Fake'}));
 assert.throws(()=>normalizeProfile({...profile,weekly_hours:{...weekly_hours,mon:[{open:'21:00',close:'07:00'}]}}));
 assert.throws(()=>normalizeProfile({...profile,weekly_hours:{...weekly_hours,mon:[{open:'09:00',close:'15:00'},{open:'14:00',close:'16:00'}]}}));
});
test('business time zone is respected on normal and DST dates',()=>{
 assert.equal(hoursResult(profile,'2026-11-23T15:00:00Z','2026-11-23T16:00:00Z').withinHours,true);
 assert.equal(hoursResult(profile,'2026-11-23T23:00:00Z','2026-11-24T00:00:00Z').withinHours,false);
 assert.equal(localParts(new Date('2026-07-06T14:00:00Z'),profile.timezone).time,'10:00');
});
test('business holidays and weekends are closed',()=>{
 assert.equal(hoursResult(profile,'2026-11-26T15:00:00Z','2026-11-26T15:30:00Z').reason,'CLOSED_DAY');
 assert.equal(hoursResult(profile,'2026-11-22T15:00:00Z','2026-11-22T15:30:00Z').withinHours,false);
});
test('appointment precheck validates future explicit UTC timestamps',()=>{
 const w=parseWindow('2026-12-01T15:00:00Z',30,new Date('2026-11-18T15:00:00Z').getTime());assert.ok(w);
 assert.equal(parseWindow('2026-12-01T10:00',30,Date.now()),null);
 assert.equal(parseWindow('2026-12-01T15:00:00Z',5,Date.now()),null);
});
test('appointment conflicts are scoped to matching employee; cancelled does not block',()=>{
 const w={startAt:'2026-12-01T15:00:00Z',endAt:'2026-12-01T16:00:00Z'};
 const b=[{employee_id:'e1',status:'confirmed',start_at:'2026-12-01T15:30:00Z',end_at:'2026-12-01T16:30:00Z'},{employee_id:'e2',status:'cancelled',start_at:'2026-12-01T15:15:00Z',end_at:'2026-12-01T16:15:00Z'}];
 assert.equal(conflicts(b,w,'e1'),true);assert.equal(conflicts(b,w,'e2'),false);
});