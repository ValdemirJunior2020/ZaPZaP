/* NexusSales round 3D language icons: USA, Spain, Brazil. No third-party assets. */
(function(){
"use strict";
const flags={
 en:'<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="nxUSClip"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#nxUSClip)"><rect width="100" height="100" fill="#fff"/>'+Array.from({length:7},(_,i)=>'<rect x="0" y="'+(i*15)+'" width="100" height="8" fill="#bb2435"/>').join('')+'<rect x="0" width="55" height="54" fill="#23458b"/>'+Array.from({length:5},(_,j)=>Array.from({length:5},(_,i)=>'<circle cx="'+(5+i*10)+'" cy="'+(5+j*11)+'" r="2.2" fill="#fff"/>').join('')).join('')+'</g></svg>',
 es:'<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="nxESClip"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#nxESClip)"><rect width="100" height="100" fill="#c82232"/><rect y="24" width="100" height="52" fill="#f6c52a"/><rect x="31" y="37" width="10" height="22" rx="2" fill="#b52d32"/><rect x="33" y="36" width="6" height="5" rx="1" fill="#e7b44b"/></g></svg>',
 pt:'<svg viewBox="0 0 100 100" aria-hidden="true"><defs><clipPath id="nxBRClip"><circle cx="50" cy="50" r="50"/></clipPath></defs><g clip-path="url(#nxBRClip)"><rect width="100" height="100" fill="#159447"/><path d="M50 13 94 50 50 87 6 50Z" fill="#f9d536"/><circle cx="50" cy="50" r="21" fill="#2057aa"/><path d="M30 48q21-10 41 9" fill="none" stroke="#fff" stroke-width="5"/><circle cx="47" cy="59" r="1.6" fill="#fff"/><circle cx="58" cy="45" r="1.4" fill="#fff"/></g></svg>'
};
const names={en:"English",es:"Español",pt:"Português"};
const header={en:"Platform language",es:"Idioma de la plataforma",pt:"Idioma da plataforma"};
const status={en:"Language saved",es:"Idioma guardado",pt:"Idioma salvo"};
function render(){
 const nav=document.getElementById("sideNav");if(!nav)return;
 let root=document.getElementById("nxLocaleBox");
 if(!root){
  root=document.createElement("section");root.id="nxLocaleBox";root.className="nx-locale-box";root.setAttribute("aria-label","Platform language / Idioma da plataforma");
  nav.insertAdjacentElement("afterend",root);
 }
 const current=window.NexusLanguage?.getLanguage?.()||"en";
 const widgetNav=nav.querySelector('[data-i18n-widget-nav]');
 if(widgetNav)widgetNav.textContent=({en:"✦ Add Chatbot to Your Website",pt:"✦ Adicionar Chatbot ao Site",es:"✦ Añadir Chatbot al Sitio Web"})[current]||"✦ Add Chatbot to Your Website";
 root.innerHTML='<div class="nx-locale-heading">'+header[current]+'</div><div class="nx-locale-choices" role="group" aria-label="Choose language">'+Object.keys(names).map(code=>'<button type="button" class="nx-locale-btn" data-locale="'+code+'" aria-label="'+names[code]+'" aria-pressed="'+(current===code)+'"><span class="nx-locale-icon">'+flags[code]+'</span><span class="nx-locale-name">'+names[code]+'</span></button>').join("")+'</div><p class="nx-locale-message" role="status" id="nxLocaleStatus"></p>';
 root.querySelectorAll("[data-locale]").forEach(button=>button.addEventListener("click",async()=>{
  const code=button.dataset.locale;
  if(button.getAttribute("aria-pressed")==="true")return;
  root.querySelectorAll("button[data-locale]").forEach(b=>b.disabled=true);
  try{
   const result=await window.NexusLanguage.setLanguage(code);
   render();
   const message=document.getElementById("nxLocaleStatus");
   if(message)message.textContent=result?.synced===false?
    (code==="pt"?"Idioma salvo neste navegador. Sincronização com a conta pendente.":code==="es"?"Idioma guardado en este navegador. Sincronización con la cuenta pendiente.":"Language saved in this browser. Account sync pending."):
    status[code];
  }catch(e){
   render();
   const message=document.getElementById("nxLocaleStatus");
   if(message)message.textContent=(code==="pt"?"Não foi possível salvar o idioma: ":code==="es"?"No se pudo guardar el idioma: ":"Could not save language: ")+(e?.message||"Error");
  }
 }));
}
window.NexusFlags={render};
window.addEventListener("nexus:language",()=>{if(document.getElementById("sideNav"))render()});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render);else render();
})();