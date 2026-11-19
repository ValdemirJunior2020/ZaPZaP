// Pure validation for business operational hours, designed for Node 22 and browser-independent tests.
const days=['mon','tue','wed','thu','fri','sat','sun'];
const timeRE=/^([01]\d|2[0-3]):[0-5]\d$/;
const dateRE=/^\d{4}-\d{2}-\d{2}$/;
const clean=(v,max)=>String(v??'').trim().slice(0,max);
function normalizeProfile(input){
 const v=input&&typeof input==='object'?input:{};
 const tz=clean(v.timezone,90);
 if(!tz||!Intl.supportedValuesOf('timeZone').includes(tz)&&!['UTC','Etc/UTC'].includes(tz))throw Error('Invalid IANA timezone / Fuso horário inválido');
 const hours={};
 for(const day of days){
  const entries=v.weekly_hours?.[day];
  if(!Array.isArray(entries)||entries.length>3)throw Error('Specify business hours for '+day);
  hours[day]=entries.map(x=>{
   const start=clean(x?.open,5),end=clean(x?.close,5);
   if(!timeRE.test(start)||!timeRE.test(end)||start>=end)throw Error('Invalid operating hours for '+day);
   return{open:start,close:end};
  }).sort((a,b)=>a.open.localeCompare(b.open));
  for(let i=1;i<hours[day].length;i++)if(hours[day][i].open<hours[day][i-1].close)throw Error('Business hours overlap on '+day);
 }
 const holidays=Array.isArray(v.closed_dates)?v.closed_dates:[];
 if(holidays.length>60||holidays.some(x=>typeof x!=='string'||!dateRE.test(x)||Number.isNaN(Date.parse(x))))throw Error('Invalid closed dates');
 const categories=Array.isArray(v.categories)?v.categories:[];
 if(categories.length>15||categories.some(x=>typeof x!=='string'||x.length>70))throw Error('Invalid business categories');
 const address=clean(v.address,250),city=clean(v.city,100),region=clean(v.region,100),country=clean(v.country,100);
 const phone=clean(v.phone,35).replace(/[\s()\-]/g,''),website=clean(v.website,250);
 if(v.phone_public===true&&!/^\+[1-9][0-9]{7,14}$/.test(phone))throw Error('To share your phone with customers, enter an international number such as +15551234567');
 if(website){let u;try{u=new URL(website)}catch{}if(!u||!['http:','https:'].includes(u.protocol))throw Error('Invalid website address')}
 return{timezone:tz,address,city,region,country,phone,website,online_only:v.online_only===true,
  address_public:v.address_public===true,phone_public:v.phone_public===true,weekly_hours:hours,closed_dates:[...new Set(holidays)].sort(),
  categories:[...new Set(categories.map(x=>x.trim()).filter(Boolean))],booking_duration_minutes:[15,30,45,60,90,120].includes(Number(v.booking_duration_minutes))?Number(v.booking_duration_minutes):30,
  booking_notice_hours:Number.isInteger(v.booking_notice_hours)&&v.booking_notice_hours>=0&&v.booking_notice_hours<=168?v.booking_notice_hours:2};
}
function localParts(instant,tz){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit',weekday:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
 const g=k=>parts.find(p=>p.type===k)?.value||'';
 return{day:{Mon:'mon',Tue:'tue',Wed:'wed',Thu:'thu',Fri:'fri',Sat:'sat',Sun:'sun'}[g('weekday')],date:`${g('year')}-${g('month')}-${g('day')}`,time:`${g('hour')}:${g('minute')}`};
}
function hoursResult(profile,startAt,endAt){
 if(!profile?.timezone||!profile?.weekly_hours)return{configured:false,withinHours:false,reason:'HOURS_UNCONFIGURED'};
 const start=new Date(startAt),end=new Date(endAt);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>=end)return{configured:true,withinHours:false,reason:'INVALID_WINDOW'};
 const s=localParts(start,profile.timezone),e=localParts(end,profile.timezone);
 if(s.date!==e.date||profile.closed_dates?.includes(s.date))return{configured:true,withinHours:false,reason:'CLOSED_DAY'};
 const within=(profile.weekly_hours[s.day]||[]).some(x=>s.time>=x.open&&e.time<=x.close);
 return{configured:true,withinHours:within,reason:within?'WITHIN_HOURS':'OUTSIDE_HOURS'};
}
export{days,normalizeProfile,localParts,hoursResult};