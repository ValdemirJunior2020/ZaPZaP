/* NexusSales • Leads & Chats calendar; UI stays inside Lead Center. */
(function(){
 "use strict";
 const state={pane:"leads",view:"month",focus:new Date(),employee:"all",editId:null,selectedLead:null};
 const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const pad=n=>String(n).padStart(2,"0");
 const isoDay=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
 const fromDay=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
 const startOfWeek=d=>{const n=new Date(d.getFullYear(),d.getMonth(),d.getDate());n.setDate(n.getDate()-((n.getDay()+6)%7));return n};
 const addDays=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
 const appointments=w=>(w.appointments||[]).filter(a=>state.employee==="all"||a.employee_id===state.employee);
 const uiLocale=()=>window.NexusLanguage?.getLanguage?.()||"en";
 const lang=(en,pt,es)=>({en,pt,es})[uiLocale()]||en;
 const labels={requested:"Requested",confirmed:"Confirmed",cancelled:"Cancelled",completed:"Completed",no_show:"No-show"};
 const statusLabel=s=>({requested:lang("Requested","Solicitado","Solicitado"),confirmed:lang("Confirmed","Confirmado","Confirmado"),cancelled:lang("Cancelled","Cancelado","Cancelado"),completed:lang("Completed","Concluído","Completado"),no_show:lang("No-show","Não compareceu","No asistió")})[s]||s;
 const fmt=(d,opts)=>new Intl.DateTimeFormat(({en:"en-US",pt:"pt-BR",es:"es-ES"})[uiLocale()]||"en-US",opts).format(d);
 const labelDate=d=>fmt(d,{day:"2-digit",month:"short",year:"numeric"});
 const hours=d=>fmt(d,{hour:"2-digit",minute:"2-digit"});
 const localDateTime=d=>isoDay(d)+"T"+pad(d.getHours())+":"+pad(d.getMinutes());
 const nameOf=(w,a)=>w.leads?.find(l=>l.id===a.lead_id)?.customer_name||a.customer_name||"Cliente";
 const staffOf=(w,a)=>w.employees?.find(e=>e.id===a.employee_id)?.name||"Equipe / sem atribuição";
 const safeStatus=s=>Object.hasOwn(labels,s)?s:"requested";
 const booked=w=>new Set((w.appointments||[]).filter(a=>a.lead_id).map(a=>a.lead_id));
 const pending=w=>(w.leads||[]).filter(l=>l.request_type==="appointment"&&!booked(w).has(l.id));
 const eventHtml=(w,a)=>'<button type="button" class="nx-cal-event nx-status-'+esc(safeStatus(a.status))+'" data-cal-edit="'+esc(a.id)+'">'+
 '<span>'+esc(hours(new Date(a.start_at)))+' · '+esc(nameOf(w,a))+'</span>'+
 '<small>'+esc(staffOf(w,a))+' · '+esc(statusLabel(safeStatus(a.status)))+'</small></button>';
 const controls=()=>'<div class="nx-cal-controls">'+
 '<div class="nx-cal-buttons"><button type="button" data-cal-nav="-1" aria-label="'+lang("Previous period","Período anterior","Período anterior")+'">‹</button><button type="button" data-cal-nav="today">'+lang("Today","Hoje","Hoy")+'</button><button type="button" data-cal-nav="1" aria-label="'+lang("Next period","Próximo período","Próximo período")+'">›</button></div>'+
 '<strong id="nxCalPeriod">'+esc(state.view==="month"?fmt(state.focus,{month:"long",year:"numeric"}):state.view==="week"?
 labelDate(startOfWeek(state.focus))+" – "+labelDate(addDays(startOfWeek(state.focus),6)):labelDate(state.focus))+'</strong>'+
 '<div class="nx-cal-buttons" role="group" aria-label="Visualização">'+["month","week","day"].map((v,i)=>'<button type="button" data-cal-view="'+v+'" class="'+(state.view===v?"chosen":"")+'">'+({en:["Month","Week","Day"],pt:["Mês","Semana","Dia"],es:["Mes","Semana","Día"]})[uiLocale()][i]+'</button>').join("")+'</div>'+
 '</div>';
 function grid(w){
  const events=appointments(w);
  let days=[];
  if(state.view==="month"){
   const first=startOfWeek(new Date(state.focus.getFullYear(),state.focus.getMonth(),1));
   const last=new Date(state.focus.getFullYear(),state.focus.getMonth()+1,0);
   for(let d=new Date(first);d<=last||((d.getDay()+6)%7)!==0;d=addDays(d,1))days.push(d);
   if(days.length<35)while(days.length<35)days.push(addDays(days[days.length-1],1));
  }else if(state.view==="week"){
   const first=startOfWeek(state.focus);days=Array.from({length:7},(_,i)=>addDays(first,i));
  }else{days=[new Date(state.focus.getFullYear(),state.focus.getMonth(),state.focus.getDate())]}
  const week=({pt:["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"],es:["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"],en:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]})[uiLocale()]||["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  const month=state.view==="month";
  return '<div class="nx-cal-scroll"><div class="nx-cal-grid '+(month?"nx-month":state.view==="week"?"nx-week":"nx-day")+'">'+
 (month||state.view==="week"?week.map(x=>'<div class="nx-cal-weekday">'+x+'</div>').join(""):"")+
 days.map(day=>{
  const iso=isoDay(day),dayEvents=events.filter(a=>isoDay(new Date(a.start_at))===iso).sort((a,b)=>new Date(a.start_at)-new Date(b.start_at));
  const today=iso===isoDay(new Date()),outside=month&&day.getMonth()!==state.focus.getMonth();
  return '<section class="nx-cal-cell '+(outside?"outside ":"")+(today?"today ":"")+'">'+
 '<button type="button" class="nx-day-number" data-cal-day="'+iso+'">'+(month?day.getDate():fmt(day,{weekday:"short",day:"2-digit",month:"short"}))+'</button>'+
 '<div class="nx-cal-events">'+dayEvents.slice(0,month?3:100).map(a=>eventHtml(w,a)).join("")+
 (dayEvents.length>3&&month?'<button type="button" class="nx-cal-more" data-cal-day="'+iso+'">+'+(dayEvents.length-3)+' mais</button>':'')+'</div></section>';
 }).join("")+'</div></div>';
 }
 function form(w){
  const ap=(w.appointments||[]).find(a=>a.id===state.editId);
  const leads=w.leads||[];
  const defaultDate=new Date(state.focus.getFullYear(),state.focus.getMonth(),state.focus.getDate(),10,0);
  const start=ap?new Date(ap.start_at):defaultDate;
  const duration=ap?Math.round((new Date(ap.end_at)-new Date(ap.start_at))/60000):30;
  const leadId=ap?.lead_id||state.selectedLead||"";
  return '<div class="nx-cal-form-card"><div class="lead-bar"><div><h3>'+(ap?"Editar agendamento":"Novo agendamento")+'</h3><p>Horário exibido no fuso do navegador: '+esc(Intl.DateTimeFormat().resolvedOptions().timeZone||"local")+'</p></div>'+
 (ap?'<button type="button" class="button" id="nxCalReset">Novo</button>':'')+'</div>'+
 '<form id="nxCalendarForm" class="nx-calendar-form">'+
 '<label>Cliente / lead<select id="nxCalLead" required><option value="">Selecione um cliente</option>'+leads.map(l=>'<option value="'+esc(l.id)+'" '+(l.id===leadId?"selected":"")+'>'+esc(l.customer_name)+' · '+esc(l.request_type||"lead")+'</option>').join("")+'</select></label>'+
 '<label>Funcionário<select id="nxCalStaff"><option value="">Equipe (sem funcionário)</option>'+(w.employees||[]).filter(e=>e.enabled||e.id===ap?.employee_id).map(e=>'<option value="'+esc(e.id)+'" '+(e.id===ap?.employee_id?"selected":"")+'>'+esc(e.name)+'</option>').join("")+'</select></label>'+
 '<label>Data e horário<input id="nxCalStart" type="datetime-local" required value="'+esc(localDateTime(start))+'"></label>'+
 '<label>Duração<select id="nxCalDuration">'+[15,30,45,60,90,120,180,240,480].map(n=>'<option value="'+n+'" '+(duration===n?"selected":"")+'>'+n+' min</option>').join("")+'</select></label>'+
 '<label>Situação<select id="nxCalStatus"><option value="requested" '+(ap?.status==="requested"?"selected":"")+'>Solicitado</option><option value="confirmed" '+(ap?.status==="confirmed"?"selected":"")+'>Confirmado</option></select></label>'+
 '<label class="nx-cal-notes">Notas<textarea id="nxCalNotes" maxlength="1000" rows="2" placeholder="Observações internas">'+esc(ap?.notes||"")+'</textarea></label>'+
 '<div class="nx-cal-form-actions"><button type="submit" class="primary" id="nxCalSave">Salvar agendamento</button>'+
 (ap?'<button type="button" class="button" data-cal-status="cancelled" data-cal-status-id="'+esc(ap.id)+'">Cancelar horário</button>'+
 '<button type="button" class="button" data-cal-status="completed" data-cal-status-id="'+esc(ap.id)+'">Concluir</button>':'')+'</div>'+
 '<p id="nxCalFeedback" role="status" class="form-message"></p></form></div>';
 }
 function render(w){
  const count=pending(w).length,upcoming=(w.appointments||[]).filter(a=>a.status==="confirmed"&&new Date(a.start_at)>=new Date()).length;
  const staff=(w.employees||[]).filter(e=>e.enabled||e.id===state.employee);
  return '<div class="nx-calendar"><div class="nx-cal-summary"><div><span>Confirmados futuros</span><strong>'+upcoming+'</strong></div><div><span>Pedidos sem horário</span><strong>'+count+'</strong></div><div><span>Agendamentos registrados</span><strong>'+(w.appointments||[]).length+'</strong></div></div>'+
 '<div id="nxGoogleCalendarMount" aria-live="polite"><section aria-label="Google Calendar" style="margin:12px 0 18px;padding:16px;border:1px solid #d7e8df;border-radius:14px;background:#fff"><div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap"><div style="display:flex;align-items:center;gap:10px"><span aria-hidden="true" style="display:inline-grid;place-items:center;width:36px;height:36px;border-radius:7px;border-top:6px solid #4285f4;border-left:6px solid #34a853;border-right:6px solid #fbbc04;border-bottom:6px solid #ea4335;font-size:14px;font-weight:800;color:#4285f4">31</span><div><strong>Google Calendar</strong><small style="display:block;color:#637d70">Your calendar, your account</small></div></div><button id="googleConnect" type="button" class="button" style="display:inline-flex;align-items:center;gap:8px;background:white;color:#243447;border:1px solid #dadce0;border-radius:9px;padding:10px 14px;font-weight:650"><span aria-hidden="true" style="font-weight:900;font-size:22px;color:#4285f4;text-shadow:1px 0 #ea4335,-1px 0 #34a853">G</span>'+lang("Connect Google Calendar","Conectar Google Agenda","Conectar Google Calendar")+'</button></div><p id="nxGoogleInfo" role="status" style="font-size:12px;color:#637d70;margin:10px 0 0">'+lang("Checking Google Calendar connection…","Verificando Google Agenda…","Comprobando Google Calendar…")+'</p></section></div>'+
  '<div class="nx-cal-layout"><div class="nx-cal-main"><div class="nx-cal-panel"><div class="lead-bar"><div><h2>Agenda de atendimentos</h2><p>Visualização diária, semanal e mensal. Pedidos de clientes precisam ser confirmados pela equipe.</p></div>'+
 '<label>Filtrar funcionário<select id="nxCalEmployee"><option value="all">Todos</option>'+staff.map(e=>'<option value="'+esc(e.id)+'" '+(state.employee===e.id?"selected":"")+'>'+esc(e.name)+'</option>').join("")+'</select></label></div>'+
 controls()+grid(w)+'</div>'+
 '<div class="nx-cal-panel"><h3>Solicitações aguardando horário</h3>'+
 (count?'<div class="nx-cal-request-list">'+pending(w).map(l=>'<div class="nx-cal-request"><div><strong>'+esc(l.customer_name)+'</strong><small>'+esc(l.preferred_time||"Horário não informado")+' · '+esc(l.customer_phone||l.customer_email||"")+'</small></div><button type="button" class="button" data-cal-request="'+esc(l.id)+'">Agendar</button></div>').join("")+'</div>':'<p class="hint">Não há pedidos de agendamento sem horário.</p>')+'</div></div>'+
 '<aside class="nx-cal-side">'+form(w)+'</aside></div></div>';
 }
 function activate(w,api,refresh){
  document.querySelectorAll("[data-lead-pane]").forEach(button=>{
   button.classList.toggle("active",button.dataset.leadPane===state.pane);
   button.setAttribute("aria-selected",String(button.dataset.leadPane===state.pane));
   button.onclick=()=>{state.pane=button.dataset.leadPane;activate(w,api,refresh)};
  });
  const list=document.getElementById("leadListPane"),cal=document.getElementById("leadCalendarPane");
  if(list)list.classList.toggle("hidden",state.pane!=="leads");
  if(cal){cal.classList.toggle("hidden",state.pane!=="calendar");if(state.pane==="calendar"){cal.innerHTML=render(w);bind(w,api,refresh);window.NexusLanguage?.apply()}}
 }
 function bind(w,api,refresh){
  if(window.NexusGoogleCalendar?.attach){window.NexusGoogleCalendar.attach(w,api,refresh)}
   else {const button=document.getElementById("googleConnect");if(button)button.onclick=()=>{const el=document.getElementById("nxGoogleInfo");if(el)el.textContent=lang("Google Calendar script is not loaded. Check browser console.","Script do Google Agenda não carregou.","El script de Google Calendar no se cargó.");};}
  const mount=()=>{document.getElementById("leadCalendarPane").innerHTML=render(w);bind(w,api,refresh);window.NexusLanguage?.apply()};
  const nav=document.querySelectorAll("[data-cal-nav]");
  nav.forEach(button=>button.onclick=()=>{
   const direction=button.dataset.calNav;
   if(direction==="today"){state.focus=new Date()}else if(state.view==="month")state.focus=new Date(state.focus.getFullYear(),state.focus.getMonth()+Number(direction),1);
   else state.focus=addDays(state.focus,Number(direction)*(state.view==="week"?7:1));
   state.editId=null;state.selectedLead=null;mount();
  });
  document.querySelectorAll("[data-cal-view]").forEach(button=>button.onclick=()=>{state.view=button.dataset.calView;mount()});
  document.querySelectorAll("[data-cal-day]").forEach(button=>button.onclick=()=>{state.focus=fromDay(button.dataset.calDay);state.view="day";state.editId=null;state.selectedLead=null;mount()});
  const sel=document.getElementById("nxCalEmployee");if(sel)sel.onchange=()=>{state.employee=sel.value;mount()};
  document.querySelectorAll("[data-cal-edit]").forEach(button=>button.onclick=()=>{state.editId=button.dataset.calEdit;state.selectedLead=null;const a=(w.appointments||[]).find(x=>x.id===state.editId);if(a)state.focus=new Date(a.start_at);mount();document.getElementById("nxCalendarForm")?.scrollIntoView({block:"nearest",behavior:"smooth"})});
  document.querySelectorAll("[data-cal-request]").forEach(button=>button.onclick=()=>{state.editId=null;state.selectedLead=button.dataset.calRequest;state.focus=new Date();mount();document.getElementById("nxCalendarForm")?.scrollIntoView({block:"nearest",behavior:"smooth"})});
  document.getElementById("nxCalReset")?.addEventListener("click",()=>{state.editId=null;state.selectedLead=null;mount()});
  document.querySelectorAll("[data-cal-status]").forEach(button=>button.onclick=async()=>{
   const status=button.dataset.calStatus,id=button.dataset.calStatusId;
   if(!confirm((status==="cancelled"?"Cancelar":"Concluir")+" este agendamento?"))return;
   button.disabled=true;
   try{await api("appointment_status",{id,status});state.editId=null;await refresh();}catch(e){document.getElementById("nxCalFeedback").textContent=e.message;button.disabled=false}
  });
  const formElement=document.getElementById("nxCalendarForm");
  if(formElement)formElement.onsubmit=async ev=>{
   ev.preventDefault();
   const leadId=document.getElementById("nxCalLead").value,local=document.getElementById("nxCalStart").value;
   const time=new Date(local);
   if(!leadId||!local||!Number.isFinite(time.getTime())){document.getElementById("nxCalFeedback").textContent="Selecione um cliente e horário válido.";return}
   const payload={id:state.editId||null,leadId,employeeId:document.getElementById("nxCalStaff").value,
    startAt:time.toISOString(),durationMinutes:Number(document.getElementById("nxCalDuration").value),
    status:document.getElementById("nxCalStatus").value,notes:document.getElementById("nxCalNotes").value};
   const btn=document.getElementById("nxCalSave");btn.disabled=true;
   try{await api("save_appointment",payload);state.selectedLead=null;state.editId=null;state.focus=time;await refresh();}
   catch(e){document.getElementById("nxCalFeedback").textContent=e.message;btn.disabled=false}
  };
 }
 window.NexusCalendar={render,activate,pane:()=>state.pane};
})();