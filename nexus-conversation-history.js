/* Owner-only conversation history: every AI chat, even without a submitted lead. */
(function(){
"use strict";
const h=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const el=id=>document.getElementById(id);
const language=()=>window.NexusLanguage?.getLanguage?.()||"en";
const tr=(en,pt,es)=>({en,pt,es})[language()]||en;
const date=value=>{try{return new Intl.DateTimeFormat(({pt:"pt-BR",es:"es-ES",en:"en-US"})[language()]||"en-US",{dateStyle:"medium",timeStyle:"short"}).format(new Date(value))}catch{return value||""}};
function activate(workspace,api){
 const tab=el("nxHistoryTab"),pane=el("nxHistoryPane"),list=el("leadListPane"),calendar=el("leadCalendarPane");
 if(!tab||!pane||!list||!calendar)return;
 let offset=0,sessions=[],active=false,loading=false;
 tab.textContent=tr("Chat history","Histórico de conversas","Historial de conversaciones");
 pane.innerHTML='<section class="card"><h2>'+h(tr("Saved AI conversations","Conversas salvas da IA","Conversaciones guardadas de IA"))+'</h2><p>'+h(tr("Chats are saved even when visitors do not leave contact information. Records remain until you delete them manually.","Conversas são registradas mesmo sem cadastro de contato. Elas permanecem até você excluí-las manualmente.","Las conversaciones se guardan aunque el visitante no deje sus datos. Permanecen hasta que las elimines manualmente."))+'</p><div id="nxHistoryResults" aria-live="polite"></div><div class="actions"><button id="nxHistoryMore" class="button hidden" type="button">'+h(tr("Load older conversations","Carregar conversas antigas","Cargar conversaciones anteriores"))+'</button><button id="nxHistoryRefresh" class="button" type="button">'+h(tr("Refresh","Atualizar","Actualizar"))+'</button></div></section><section id="nxHistoryDetail" class="card hidden" aria-live="polite"></section>';
 const result=el("nxHistoryResults"),more=el("nxHistoryMore"),detail=el("nxHistoryDetail");
 async function load(reset=false){
  if(loading)return;
  loading=true;more.disabled=true;
  if(reset){offset=0;sessions=[];detail.classList.add("hidden")}
  result.textContent=tr("Loading conversations…","Carregando conversas…","Cargando conversaciones…");
  try{
   const data=await api("list_conversations",{offset});
   sessions.push(...(data.sessions||[]));offset=data.nextOffset;
   result.innerHTML=sessions.length?'<div class="lead-list">'+sessions.map((s,i)=>'<button type="button" class="lead-row" data-nx-session="'+h(s.id)+'"><span class="lead-avatar">💬</span><span class="lead-main"><strong>'+h(tr("Visitor conversation","Conversa de visitante","Conversación de visitante"))+' #'+(i+1)+'</strong><small>'+h(date(s.started_at))+'</small><small>'+h(s.personal_assistant_id?tr("Personal AI","IA pessoal","IA personal"):tr("Business AI","IA empresarial","IA empresarial"))+'</small></span><span class="lead-right"><span class="lead-status">'+h(Number(s.message_count)||0)+' '+h(tr("requests","perguntas","preguntas"))+'</span></span></button>').join("")+'</div>':'<div class="empty">'+h(tr("No saved conversations yet.","Ainda não há conversas salvas.","Todavía no hay conversaciones guardadas."))+'</div>';
   more.classList.toggle("hidden",!data.hasMore);
   result.querySelectorAll("[data-nx-session]").forEach(button=>button.onclick=()=>open(button.dataset.nxSession));
  }catch(e){result.textContent=e.message||tr("Could not load chat history.","Não foi possível carregar o histórico.","No se pudo cargar el historial.")}
  finally{loading=false;more.disabled=false}
 }
 async function open(id){
  const session=sessions.find(x=>x.id===id);if(!session)return;
  detail.classList.remove("hidden");detail.textContent=tr("Loading messages…","Carregando mensagens…","Cargando mensajes…");
  try{
   const data=await api("conversation_history",{sessionId:id});
   detail.innerHTML='<div class="lead-bar"><div><h2>'+h(tr("Conversation","Conversa","Conversación"))+'</h2><p>'+h(date(session.started_at))+'</p></div><button type="button" id="nxHistoryClose" class="button">'+h(tr("Close","Fechar","Cerrar"))+'</button></div><div class="lead-transcript">'+(data.messages?.length?data.messages.map(m=>'<div class="lead-msg '+(m.role==="user"?"visitor":"assistant")+'"><small>'+h(m.role==="user"?tr("Visitor","Visitante","Visitante"):tr("AI assistant","Assistente de IA","Asistente de IA"))+' · '+h(date(m.created_at))+'</small><p>'+h(m.content)+'</p></div>').join(""):'<p>'+h(tr("No messages saved.","Nenhuma mensagem salva.","No hay mensajes guardados."))+'</p>')+'</div><div class="actions"><button type="button" class="button danger" id="nxHistoryDelete">'+h(tr("Delete conversation permanently","Excluir conversa permanentemente","Eliminar conversación permanentemente"))+'</button></div><p role="status" id="nxHistoryActionStatus"></p>';
   el("nxHistoryClose").onclick=()=>detail.classList.add("hidden");
   el("nxHistoryDelete").onclick=async()=>{
    if(!confirm(tr("Delete this conversation and all its messages permanently? This cannot be undone. Any linked lead will be kept without the chat history.","Excluir esta conversa e todas as mensagens permanentemente? Isso não pode ser desfeito. Leads vinculados serão preservados, mas sem o histórico.","¿Eliminar esta conversación y todos sus mensajes de forma permanente? No se puede deshacer. Los contactos asociados se conservarán sin el historial.")))return;
    const button=el("nxHistoryDelete");button.disabled=true;
    try{
     const result=await api("delete_conversation",{sessionId:id,confirm:true});
     if(result.deleted!==true)throw Error(tr("Deletion was not confirmed.","Exclusão não confirmada.","No se confirmó la eliminación."));
     await load(true);
    }catch(e){const status=el("nxHistoryActionStatus");if(status)status.textContent=e.message;if(button.isConnected)button.disabled=false}
   };
   detail.scrollIntoView({behavior:"smooth",block:"nearest"});
  }catch(e){detail.textContent=e.message||"Unable to load conversation"}
 }
 tab.onclick=()=>{
  active=true;pane.classList.remove("hidden");list.classList.add("hidden");calendar.classList.add("hidden");
  document.querySelectorAll(".nx-lead-tabs button").forEach(b=>{b.classList.toggle("active",b===tab);b.setAttribute("aria-selected",String(b===tab))});
  load(true);
 };
 more.onclick=()=>load();
 el("nxHistoryRefresh").onclick=()=>load(true);
 document.querySelectorAll(".nx-lead-tabs button:not(#nxHistoryTab)").forEach(b=>b.addEventListener("click",()=>{
  active=false;pane.classList.add("hidden");detail.classList.add("hidden");tab.classList.remove("active");tab.setAttribute("aria-selected","false");
 }));
}
window.NexusConversationHistory={activate};
})();
