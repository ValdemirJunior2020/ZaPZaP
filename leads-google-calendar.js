/* Google Calendar connection in Leads & Chats. No OAuth credentials or tokens in client code. */
(function(){
 "use strict";
 const state={loaded:false,loading:false,connected:false,email:"",events:[],error:"",syncStatus:"not_synced"};
 const esc=s=>String(s??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const l=(en,pt,es)=>({en,pt,es})[window.NexusLanguage?.getLanguage?.()||"en"]||en;
 const logo='<svg width="28" height="28" viewBox="0 0 48 48" aria-hidden="true"><rect width="36" height="36" x="6" y="6" rx="6" fill="#fff" stroke="#d9e8df"/><path d="M6 14V12a6 6 0 0 1 6-6h27v10H6" fill="#4285F4"/><path d="M6 16h9v26H12a6 6 0 0 1-6-6Z" fill="#34A853"/><path d="M32 16h10v20a6 6 0 0 1-6 6h-4Z" fill="#FBBC04"/><path d="M15 33h17v9H15" fill="#EA4335"/><text x="24" y="31" fill="#4285F4" font-family="Arial,sans-serif" font-weight="700" font-size="14" text-anchor="middle">31</text></svg>';
 function template(w){
  const buttons=state.connected?
   '<button class="button" type="button" id="googleRefresh">'+l("Refresh","Atualizar","Actualizar")+'</button> <button class="button" type="button" id="googleDisconnect">'+l("Disconnect","Desconectar","Desconectar")+'</button>':
   '<button class="button" type="button" id="googleConnect">'+l("Connect to Google Calendar","Conectar ao Google Agenda","Conectar con Google Calendar")+'</button>';
  const upcoming=state.connected?'<div style="margin-top:11px"><strong>'+l("Upcoming Google appointments","Próximos compromissos do Google","Próximas citas de Google")+'</strong>'+
   (state.events.length?state.events.slice(0,8).map(e=>'<div style="display:flex;gap:8px;justify-content:space-between;flex-wrap:wrap;padding:5px 0;border-bottom:1px solid #e1e9e2"><span>'+esc(e.title)+'</span><small>'+esc(e.start?new Date(e.start).toLocaleString():"")+'</small></div>').join(""):'<p class="hint">'+l("No upcoming events.","Nenhum evento futuro.","No hay próximos eventos.")+'</p>')+'</div>':'';
  const sync=state.connected?'<details style="margin-top:12px"><summary style="cursor:pointer">'+l("Sync Nexus appointments","Sincronizar agendamentos do Nexus","Sincronizar citas de Nexus")+'</summary>'+
    '<div style="display:grid;gap:6px;padding-top:8px">'+(w.appointments||[]).filter(a=>a.status==="confirmed"||a.status==="cancelled").slice(0,40).map(a=>
     '<div style="display:flex;gap:10px;justify-content:space-between;align-items:center"><span>'+esc(a.customer_name||"Appointment")+' · '+esc(new Date(a.start_at).toLocaleDateString())+' · '+esc(a.status)+'</span><button type="button" class="button" data-google-sync="'+esc(a.id)+'">'+l("Sync","Sincronizar","Sincronizar")+'</button></div>').join("")+'</div></details>':'';
  return '<section id="nxGoogleCalendar" aria-label="Google Calendar" style="padding:15px;margin:12px 0 18px;border:1px solid #d7e8df;border-radius:14px;background:linear-gradient(120deg,#f5fbf7,#fff)">'+
   '<div style="display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap"><div style="display:flex;gap:9px;align-items:center">'+logo+
   '<div><strong>Google Calendar</strong><small style="display:block;color:#637d70">'+(state.connected?esc(state.email):l("Your calendar, your account","Sua agenda, sua conta","Tu calendario, tu cuenta"))+'</small></div></div><div>'+buttons+'</div></div>'+
   '<p id="nxGoogleInfo" role="status" style="margin:9px 0 0;font-size:12px;color:#4c725f">'+esc(state.error||
      (state.connected?l("Connected · Sync: ","Conectado · Sincronização: ","Conectado · Sincronización: ")+state.syncStatus:
       state.loading?l("Checking connection…","Verificando conexão…","Comprobando conexión…"):l("Connect your Google account to view appointments.","Conecte sua conta Google para ver agendamentos.","Conecta tu cuenta para ver las citas.")))+'</p>'+upcoming+sync+'</section>';
 }
 let apiNow=null,wNow=null;
 function render(){
  const cal=document.getElementById("leadCalendarPane");if(!cal||cal.classList.contains("hidden"))return;
  const summary=cal.querySelector(".nx-cal-summary");if(!summary)return;
  cal.querySelector("#nxGoogleCalendar")?.remove();
  summary.insertAdjacentHTML("afterend",template(wNow||{}));
  bindButtons();
 }
 async function load(force=false){
  if(state.loading||state.loaded&&!force)return;
  state.loading=true;state.error="";render();
  try{
   const s=await apiNow("google_calendar_status");
   state.connected=s.connected===true;state.email=s.googleEmail||"";state.syncStatus=s.syncStatus||"not_synced";
   state.events=state.connected?(await apiNow("google_calendar_events")).events||[]:[];
   state.loaded=true;
  }catch(e){state.connected=false;state.events=[];state.loaded=true;state.error=l("Google Calendar is not ready yet. Ask the app owner to finish setup.","O Google Agenda ainda não está pronto.","Google Calendar todavía no está disponible.");}
  finally{state.loading=false;render()}
 }
 function bindButtons(){
  const connect=document.getElementById("googleConnect");if(connect)connect.onclick=async()=>{
   connect.disabled=true;
   try{
    const r=await apiNow("google_calendar_connect");
    const u=new URL(r.authorizationUrl||"");
    if(u.protocol!=="https:"||u.hostname!=="accounts.google.com")throw Error("Authorization unavailable");
    window.location.assign(u.href);
   }catch(e){state.error=l("Google Calendar needs one-time setup by the app owner.","O proprietário precisa configurar o Google Agenda uma vez.","El propietario debe configurar Google Calendar una vez.");render()}
  };
  const refresh=document.getElementById("googleRefresh");if(refresh)refresh.onclick=()=>{state.loaded=false;void load(true)};
  const disconnect=document.getElementById("googleDisconnect");if(disconnect)disconnect.onclick=async()=>{
   if(!confirm(l("Disconnect your Google Calendar? Existing events stay on Google.","Desconectar Google Agenda? Eventos existentes continuam no Google.","¿Desconectar? Los eventos existentes seguirán en Google.")))return;
   try{await apiNow("google_calendar_disconnect");state.connected=false;state.loaded=false;state.events=[];render()}
   catch(e){state.error=e.message;render()}
  };
  document.querySelectorAll("[data-google-sync]").forEach(button=>button.onclick=async()=>{
   button.disabled=true;
   try{
    await apiNow("google_calendar_sync",{appointmentId:button.dataset.googleSync});
    state.error=l("Appointment synced to Google Calendar.","Agendamento sincronizado com Google.","Cita sincronizada con Google.");
    state.loaded=false;await load(true);
   }catch(e){state.error=l("Saved in Nexus, but Google sync failed: ","Salvo no Nexus, mas falhou a sincronização: ","Guardado en Nexus, pero falló la sincronización: ")+e.message;render()}
  });
 }
 function attach(w,api){
  wNow=w;apiNow=api;render();
  if(!state.loaded&&!state.loading)void load();
 }
 async function checkAvailable(startAt,durationMinutes,appointmentId){
  if(!state.connected)return{available:true,checked:false};
  return apiNow("google_calendar_availability",{startAt,durationMinutes,appointmentId});
 }
 async function sync(id){
  if(!state.connected)return{synced:false,skipped:true};
  const r=await apiNow("google_calendar_sync",{appointmentId:id});
  state.syncStatus="synced";return r;
 }
 function warn(message){state.error=message;render()}
 window.NexusGoogleCalendar={attach,connected:()=>state.connected,checkAvailable,sync,warn};
})();
