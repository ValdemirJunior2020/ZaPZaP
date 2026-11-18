// This route is delegated by store-inquiry.mjs. Tentative availability, NEVER a confirmed booking.
import {allow,clientIp} from './abuse.mjs';
import {env,json,parse,publishedStore,db,str} from './tenant.mjs';
import {parseWindow,conflicts} from './nexus-booking.mjs';
import {hoursResult} from './nexus-business-profile.mjs';
export async function checkSlot(event){
 try{
  const p=parse(event,2000),slug=str(p.slug,50),window=parseWindow(p.startAt,p.durationMinutes);
  if(!slug||!window)return json(400,{error:'Valid future date and time required'});
  const c=env();
  if(!await allow(c,'nexus_public_slot',clientIp(event),12,3600))return json(429,{error:'Please try later'});
  const published=await publishedStore(c,slug);
  if(!published||published.store.appointments_enabled===false)return json(404,{error:'Appointment requests unavailable'});
  const sourceCode=str(p.sourceCode,80);
  const qr=sourceCode?(await db(c,'nx_qr_sources?store_id=eq.'+encodeURIComponent(published.store.id)+'&code=eq.'+encodeURIComponent(sourceCode)+'&enabled=eq.true&select=id'))?.[0]:null;
  const emp=qr?(await db(c,'nx_employees?store_id=eq.'+encodeURIComponent(published.store.id)+'&qr_source_id=eq.'+encodeURIComponent(qr.id)+'&enabled=eq.true&archived=eq.false&select=id'))?.[0]:null;
  let profile=null;
  try{profile=(await db(c,'nx_business_profiles?store_id=eq.'+encodeURIComponent(published.store.id)+'&select=timezone,weekly_hours,closed_dates,booking_notice_hours'))?.[0]||null}catch(e){if(!/nx_business_profiles|42P01|schema cache/i.test(String(e.message)))throw e}
  const hourCheck=hoursResult(profile,window.startAt,window.endAt);
  const minimum=profile?.booking_notice_hours??2;
  const tooSoon=new Date(window.startAt).getTime()<Date.now()+minimum*3600000;
  const busy=await db(c,'nx_appointments?store_id=eq.'+encodeURIComponent(published.store.id)+'&status=in.(requested,confirmed)&start_at=lt.'+encodeURIComponent(window.endAt)+'&end_at=gt.'+encodeURIComponent(window.startAt)+'&select=employee_id,staff_id,status,start_at,end_at');
  const conflict=conflicts(busy,window,emp?.id||null);
  const available=hourCheck.configured&&hourCheck.withinHours&&!tooSoon&&!conflict;
  return json(200,{availableForRequest:available,confirmed:false,businessHoursVerified:hourCheck.configured,
   timezone:profile?.timezone||null,code:!hourCheck.configured?'HOURS_UNCONFIGURED':!hourCheck.withinHours?hourCheck.reason:tooSoon?'TOO_SOON':conflict?'SLOT_CONFLICT':'TENTATIVE_ONLY'});
 }catch(e){console.error('Nexus availability:',String(e.code||e.status||'UNAVAILABLE'));return json(e.status||503,{error:'Availability check temporarily unavailable'})}
}