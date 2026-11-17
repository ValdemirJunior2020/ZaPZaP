// Public SmartStore booking picker. All available slots originate from server/database.
const by=id=>document.getElementById(id);
const safeText=s=>String(s??"").slice(0,200);
const localDay=(date,timeZone)=>{
 const pieces=new Intl.DateTimeFormat("en-US",{timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(date);
 const v=Object.fromEntries(pieces.map(x=>[x.type,x.value]));
 return v.year+"-"+v.month+"-"+v.day;
};
let current=null,selectedSlug="",timezone="America/New_York",requestCounter=0;
function fill(id,items,placeholder){
 const el=by(id);el.replaceChildren();
 const initial=document.createElement("option");initial.value="";initial.textContent=placeholder;el.append(initial);
 for(const item of items){const option=document.createElement("option");option.value=item.id;option.textContent=item.name+(item.duration_minutes?" · "+item.duration_minutes+" min":"");el.append(option)}
}
export function setupCalendarPicker(config,slug){
 current=config?.enabled?config:null;selectedSlug=slug;
 const request=by("requestType");
 const supported=Boolean(current&&current.services?.length&&current.staff?.length);
 if(!supported)return updateCalendarVisibility();
 timezone=current.timezone||"America/New_York";
 fill("calPublicService",current.services,"Choose a service");
 fill("calPublicStaff",current.staff,"Choose a team member");
 const today=localDay(new Date(),timezone);
 const end=new Date(Date.now()+90*86400000);
 by("calPublicDay").min=today;
 by("calPublicDay").max=localDay(end,timezone);
 by("calPublicDay").value=today;
 by("calendarNotice").textContent="Times are shown in "+timezone+". "+(current.autoConfirm?"Available appointments are confirmed automatically.":"The business reviews and confirms appointment requests.");
 ["calPublicService","calPublicStaff","calPublicDay"].forEach(id=>by(id).onchange=refreshCalendarSlots);
 updateCalendarVisibility();
}
export function updateCalendarVisibility(){
 const isAppointment=by("requestType").value==="appointment",withSlots=Boolean(current&&current.services?.length&&current.staff?.length);
 by("calendarPicker").classList.toggle("hidden",!isAppointment||!withSlots);
 by("preferredTimeWrap").classList.toggle("hidden",!isAppointment||withSlots);
 if(isAppointment&&withSlots)refreshCalendarSlots();
}
export function isStructuredCalendar(){return by("requestType").value==="appointment"&&Boolean(current&&current.services?.length&&current.staff?.length)}
export function calendarSelection(){
 if(!isStructuredCalendar())return null;
 return{serviceId:by("calPublicService").value,staffId:by("calPublicStaff").value,startAt:by("calPublicSlot").value};
}
async function refreshCalendarSlots(){
 const id=++requestCounter;
 const serviceId=by("calPublicService").value,staffId=by("calPublicStaff").value,day=by("calPublicDay").value;
 fill("calPublicSlot",[],"Select service, staff and date");
 if(!serviceId||!staffId||!day){by("calPublicMessage").textContent="Choose the service, team member and day.";return}
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)){by("calPublicMessage").textContent="Choose a valid date.";return}
 by("calPublicMessage").textContent="Checking available times…";
 try{
  // Slot lookup intentionally omits QR src so it does not count extra scans.
  const query=new URLSearchParams({slug:selectedSlug,serviceId,staffId,day});
  const r=await fetch("/.netlify/functions/public-store?"+query,{cache:"no-store"});
  const body=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(body.error||"Availability temporarily unavailable");
  if(id!==requestCounter)return;
  const slots=body.calendar?.slots||[];
  const el=by("calPublicSlot");
  el.replaceChildren();
  const first=document.createElement("option");first.value="";first.textContent=slots.length?"Choose an available time":"No available times";el.append(first);
  const formatter=new Intl.DateTimeFormat(undefined,{timeZone,hour:"numeric",minute:"2-digit"});
  for(const slot of slots){
   const option=document.createElement("option");option.value=slot;option.textContent=formatter.format(new Date(slot));el.append(option)
  }
  by("calPublicMessage").textContent=slots.length?slots.length+" available start times · "+timezone:"No availability on this date. Try another day.";
 }catch(e){if(id===requestCounter)by("calPublicMessage").textContent=safeText(e.message)}
}
