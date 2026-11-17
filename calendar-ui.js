// NexusSales Calendar control center. Private owner UI; all writes use authenticated owner API.
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const datestr=s=>{try{return new Date(s).toLocaleString(undefined,{dateStyle:"medium",timeStyle:"short"})}catch{return s}};
const statusLabel=s=>({requested:"Awaiting approval",confirmed:"Confirmed",cancelled:"Cancelled",completed:"Completed",no_show:"No show"}[s]||s);
const shortId=id=>String(id||"").slice(0,8);
const options=(list,current,field="name")=>list.map(x=>'<option value="'+escape(x.id)+'" '+(x.id===current?"selected":"")+'>'+escape(x[field])+'</option>').join("");
export function renderCalendar(cal,store){
 cal=cal||{};const cfg=cal.settings||{},staff=cal.staff||[],services=cal.services||[],hours=cal.hours||[],blocks=cal.blocks||[],appointments=cal.appointments||[];
 const pending=appointments.filter(a=>a.status==="requested").length,confirmed=appointments.filter(a=>a.status==="confirmed").length;
 const tz=cfg.timezone||"America/New_York";
 const metric=(name,n,info)=>'<div class="cal-stat"><small>'+name+'</small><strong>'+n+'</strong><span>'+info+'</span></div>';
 let out='<div class="cal-stats">'+metric("Upcoming / recent",appointments.length,"Appointments in this workspace")+metric("Needs approval",pending,"Customer requests")+metric("Confirmed",confirmed,"Reserved times")+metric("Active services",services.filter(x=>x.active).length,"Bookable offerings")+'</div>';
 if(!store) return out+'<div class="card"><p>Save your business profile to configure its calendar.</p></div>';
 out+='<div class="card cal-card"><div class="cal-head"><div><h2>Calendar configuration</h2><p>Choose when customers may request a time. Hours are interpreted in the selected business timezone.</p></div><span class="cal-pill">'+(cfg.enabled?"Booking active":"Booking paused")+'</span></div>'+
 '<form id="calSettingsForm" class="cal-form">'+
 '<label>Business timezone<input id="calTimezone" list="calTimezones" required maxlength="80" value="'+escape(tz)+'"><datalist id="calTimezones"><option value="America/New_York"><option value="America/Chicago"><option value="America/Denver"><option value="America/Los_Angeles"><option value="Europe/London"><option value="Europe/Lisbon"><option value="America/Sao_Paulo"><option value="UTC"></datalist></label>'+
 '<label>Minimum notice (hours)<input id="calNotice" type="number" min="0" max="168" required value="'+(cfg.notice_hours??2)+'"></label>'+
 '<label>Book ahead (days)<input id="calHorizon" type="number" min="1" max="90" required value="'+(cfg.horizon_days??30)+'"></label>'+
 '<label class="cal-check"><input id="calEnabled" type="checkbox" '+(cfg.enabled?"checked":"")+'> Enable online calendar</label>'+
 '<label class="cal-check"><input id="calAuto" type="checkbox" '+(cfg.auto_confirm?"checked":"")+'> Automatically confirm available slots</label>'+
 '<button class="primary" type="submit">Save calendar settings</button></form><p class="hint">Default: requests need your approval. Auto-confirm checks availability and reserves the time. No email or SMS is sent automatically.</p></div>';
 out+='<div class="cal-columns"><div class="card cal-card"><h2>Team / staff</h2><p>Each staff member has a separate booking calendar, preventing overlapping appointments.</p>'+
 '<form id="calStaffForm" class="cal-inline"><input id="calStaffName" maxlength="90" required minlength="2" placeholder="Staff member name"><button class="primary" type="submit">Add</button></form><div class="cal-mini-list">'+staff.map(s=>'<div class="cal-mini-item"><strong>'+escape(s.name)+'</strong><button class="button" data-cal-staff-toggle="'+escape(s.id)+'">'+(s.active?"Deactivate":"Activate")+'</button></div>').join("")+'</div></div>'+
 '<div class="card cal-card"><h2>Bookable services</h2><p>Set the appointment duration for each consultation or service.</p>'+
 '<form id="calServiceForm" class="cal-inline"><input id="calServiceName" maxlength="100" required minlength="2" placeholder="e.g. Consultation"><select id="calServiceDuration">'+[15,30,45,60,90,120].map(n=>'<option value="'+n+'" '+(n===30?'selected':'')+'>'+n+' min</option>').join("")+'</select><button class="primary" type="submit">Add</button></form>'+
 '<div class="cal-mini-list">'+services.map(s=>'<div class="cal-mini-item"><strong>'+escape(s.name)+'</strong><select data-cal-duration="'+escape(s.id)+'">'+[15,30,45,60,90,120].map(n=>'<option value="'+n+'" '+(n===s.duration_minutes?'selected':'')+'>'+n+'m</option>').join("")+'</select><button class="button" data-cal-service-save="'+escape(s.id)+'">Save</button><button class="button" data-cal-service-toggle="'+escape(s.id)+'">'+(s.active?"Disable":"Enable")+'</button></div>').join("")+'</div></div></div>';
 out+='<div class="card cal-card"><h2>Weekly working hours</h2><p>Check the days customers can book, then choose the beginning and end of each day. Times use <strong>'+escape(tz)+'</strong>.</p><form id="calHoursForm"><div class="cal-week">'+days.map((day,index)=>{
 const h=hours.find(x=>x.weekday===index);const enabled=h?h.enabled:index>0&&index<6;const start=(h?.start_time||"09:00").slice(0,5),end=(h?.end_time||"17:00").slice(0,5);
 return '<div class="cal-day" data-cal-day="'+index+'"><label class="cal-day-name"><input type="checkbox" class="cal-day-enabled" '+(enabled?"checked":"")+'>'+day+'</label><label>From<input type="time" class="cal-start" value="'+escape(start)+'"></label><label>To<input type="time" class="cal-end" value="'+escape(end)+'"></label></div>'
 }).join("")+'</div><button class="primary" type="submit">Save weekly hours</button></form></div>';
 out+='<div class="card cal-card"><h2>Time off / blocked dates</h2><p>Block a holiday, break or unavailable period for the whole business or an individual team member. Enter times in <strong>your device timezone</strong>.</p>'+
 '<form id="calBlockForm" class="cal-form"><label>From<input id="calBlockStart" type="datetime-local" required></label><label>Until<input id="calBlockEnd" type="datetime-local" required></label>'+
 '<label>Staff member<select id="calBlockStaff"><option value="">Whole business</option>'+options(staff.filter(s=>s.active),null)+'</select></label>'+
 '<label>Reason<input id="calBlockReason" maxlength="180" placeholder="Vacation / lunch / holiday"></label><button class="primary" type="submit">Block time</button></form>'+
 '<div class="cal-mini-list">'+blocks.map(b=>'<div class="cal-mini-item"><div><strong>'+escape(b.reason||"Unavailable")+'</strong><small>'+escape(datestr(b.start_at))+' – '+escape(datestr(b.end_at))+' · '+escape(staff.find(s=>s.id===b.staff_id)?.name||"Whole business")+'</small></div><button class="button" data-cal-remove-block="'+escape(b.id)+'">Remove</button></div>').join("")+'</div></div>';
 out+='<div class="card cal-card"><div class="cal-head"><div><h2>Appointment requests</h2><p>Approve, cancel, finish or reschedule appointments. Pending requests already hold their time to prevent double bookings.</p></div><select id="calStatusFilter" aria-label="Filter appointments"><option value="all">All statuses</option>'+["requested","confirmed","cancelled","completed","no_show"].map(s=>'<option value="'+s+'">'+statusLabel(s)+'</option>').join("")+'</select></div>'+
 '<div class="cal-booking-list">'+(appointments.length?appointments.map(a=>{
 const person=staff.find(s=>s.id===a.staff_id)?.name||"Staff",service=services.find(s=>s.id===a.service_id)?.name||"Service",open=["requested","confirmed"].includes(a.status);
 return '<article class="cal-booking" data-cal-status="'+escape(a.status)+'"><div class="cal-booking-summary"><div><strong>'+escape(a.customer_name)+'</strong><span>'+escape(service)+' · '+escape(person)+' · '+escape(datestr(a.start_at))+'</span><small>'+escape(a.customer_phone||a.customer_email||"")+' · '+escape(a.notes||"No note")+'</small></div><em>'+statusLabel(a.status)+'</em></div>'+
 (open?'<div class="cal-booking-actions">'+(a.status==="requested"?'<button class="button" data-cal-action="confirmed" data-cal-id="'+escape(a.id)+'">Confirm</button>':'')+
 '<button class="button" data-cal-action="completed" data-cal-id="'+escape(a.id)+'">Completed</button><button class="button" data-cal-action="no_show" data-cal-id="'+escape(a.id)+'">No-show</button><button class="button" data-cal-action="cancelled" data-cal-id="'+escape(a.id)+'">Cancel</button></div>'+
 '<form class="cal-move-form" data-cal-move="'+escape(a.id)+'"><label>Reschedule (device timezone)<input type="datetime-local" required></label><label>With<select>'+options(staff.filter(s=>s.active),a.staff_id)+'</select></label><button class="button" type="submit">Move appointment</button></form>':'')+'</article>';
 }).join(""):'<div class="empty">No appointment requests yet. Enable the calendar and share your SmartStore link or QR code.</div>')+'</div></div>';
 return out;
}
export function bindCalendar(cal,api,reload,toast){
 cal=cal||{};const by=id=>document.getElementById(id),staff=cal.staff||[],services=cal.services||[];
 const execute=async(action,payload,message)=>{try{await api(action,payload);await reload();toast(message)}catch(e){toast(e.message)}};
 by("calSettingsForm").onsubmit=e=>{e.preventDefault();execute("calendar_settings",{timezone:by("calTimezone").value,noticeHours:Number(by("calNotice").value),horizonDays:Number(by("calHorizon").value),enabled:by("calEnabled").checked,autoConfirm:by("calAuto").checked},"Calendar settings saved")};
 by("calStaffForm").onsubmit=e=>{e.preventDefault();execute("calendar_staff",{name:by("calStaffName").value},"Staff member saved")};
 by("calServiceForm").onsubmit=e=>{e.preventDefault();execute("calendar_service",{name:by("calServiceName").value,durationMinutes:Number(by("calServiceDuration").value)},"Service saved")};
 document.querySelectorAll("[data-cal-staff-toggle]").forEach(el=>el.onclick=()=>{
  const s=staff.find(x=>x.id===el.dataset.calStaffToggle);if(s)execute("calendar_staff",{id:s.id,name:s.name,active:!s.active},"Staff updated");
 });
 document.querySelectorAll("[data-cal-service-toggle]").forEach(el=>el.onclick=()=>{
  const s=services.find(x=>x.id===el.dataset.calServiceToggle);if(s)execute("calendar_service",{id:s.id,name:s.name,durationMinutes:s.duration_minutes,active:!s.active},"Service updated");
 });
 document.querySelectorAll("[data-cal-service-save]").forEach(el=>el.onclick=()=>{
  const s=services.find(x=>x.id===el.dataset.calServiceSave),select=document.querySelector('[data-cal-duration="'+el.dataset.calServiceSave+'"]');
  if(s&&select)execute("calendar_service",{id:s.id,name:s.name,durationMinutes:Number(select.value),active:s.active},"Duration saved");
 });
 by("calHoursForm").onsubmit=e=>{
  e.preventDefault();const hours=[...document.querySelectorAll("[data-cal-day]")].map(row=>({weekday:Number(row.dataset.calDay),enabled:row.querySelector(".cal-day-enabled").checked,startTime:row.querySelector(".cal-start").value,endTime:row.querySelector(".cal-end").value}));
  execute("calendar_hours",{hours},"Working hours saved");
 };
 by("calBlockForm").onsubmit=e=>{
  e.preventDefault();const start=by("calBlockStart").value,end=by("calBlockEnd").value;
  if(!start||!end)return toast("Choose the beginning and end of the block");
  execute("calendar_block",{startAt:new Date(start).toISOString(),endAt:new Date(end).toISOString(),staffId:by("calBlockStaff").value||null,reason:by("calBlockReason").value},"Time blocked");
 };
 document.querySelectorAll("[data-cal-remove-block]").forEach(el=>el.onclick=()=>{if(confirm("Remove this calendar block?"))execute("calendar_delete_block",{id:el.dataset.calRemoveBlock},"Block removed")});
 by("calStatusFilter").onchange=e=>document.querySelectorAll("[data-cal-status]").forEach(el=>el.classList.toggle("hidden",e.target.value!=="all"&&el.dataset.calStatus!==e.target.value));
 document.querySelectorAll("[data-cal-action]").forEach(el=>el.onclick=()=>{const status=el.dataset.calAction;if(confirm("Change appointment to "+statusLabel(status)+"?"))execute("calendar_appointment_status",{id:el.dataset.calId,status},"Appointment updated")});
 document.querySelectorAll("[data-cal-move]").forEach(form=>form.onsubmit=e=>{
  e.preventDefault();const when=form.querySelector('input[type="datetime-local"]').value,staffId=form.querySelector("select").value;
  if(!when)return toast("Choose the new start time");
  if(confirm("Move this appointment to the selected time?"))execute("calendar_move",{id:form.dataset.calMove,staffId,startAt:new Date(when).toISOString()},"Appointment rescheduled");
 });
}
