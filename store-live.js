const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=(()=>{const match=location.pathname.match(/^\/s\/([a-z0-9-]{3,50})\/?$/i);return match?match[1]:new URLSearchParams(location.search).get("slug")||new URLSearchParams(location.search).get("s")||""})();
let employee=null,store=null,items=[],history=[],ready=false,working=false,chatClosed=false,sessionId=null,remaining=10,sourceCode=new URLSearchParams(location.search).get('src')||'';

// Public storefront localization: trusted edge country first, then employee preference,
// then browser language. No geolocation permission, IP storage, or external geocoding.
let pageLocale="en";
const terms={
 en:{welcome:"WELCOME",readMore:"Read more",readLess:"Show less",products:"Products & services",contact:"Request information or an appointment",contactDescription:"Send your request to the business. If you used the chat, its history will be attached to your inquiry. Appointments require confirmation.",name:"Your name",email:"Email address",phone:"Phone number (or email above)",type:"Request type",message:"What can we help with?",send:"Send inquiry",information:"Information",appointment:"Appointment request",callback:"Call me back",quote:"Request quote",preferredTime:"Preferred appointment date/time",askQuote:"Request quote",askAppointment:"Schedule request",chatSend:"Send",askPlaceholder:"Ask about this business…",offer:"What do you offer?",pricing:"Pricing",hours:"Hours",footer:"Chats may be saved and shared with the business when you submit an inquiry. Appointments are requests only.",count:"offerings",one:"offering",askThis:"Ask about this",priceOnRequest:"Price on request",notListed:"This business has not listed any offerings yet. You can still contact them below.",unavailable:"Assistant temporarily unavailable",loading:"Looking that up…",welcomeChat:"Hi! Welcome to {name}! I can help with our services, pricing and business information. What would you like to know?",closed:"Chat finished · Send contact request",endNote:"Your chat limit has been reached. Leave your phone number or email and the business can continue helping.",received:"Your request has been received and saved for {name}. The business can review it and follow up."},
 pt:{welcome:"BEM-VINDO",readMore:"Ver mais",readLess:"Ver menos",products:"Produtos e serviços",contact:"Solicitar informações ou atendimento",contactDescription:"Envie sua solicitação à empresa. O histórico do chat poderá ser associado ao pedido. Agendamentos precisam de confirmação.",name:"Seu nome",email:"E-mail",phone:"Telefone (ou e-mail)",type:"Tipo de solicitação",message:"Como podemos ajudar?",send:"Enviar solicitação",information:"Informações",appointment:"Solicitar agendamento",callback:"Solicitar retorno",quote:"Solicitar orçamento",preferredTime:"Data e horário preferidos",askQuote:"Solicitar orçamento",askAppointment:"Solicitar atendimento",chatSend:"Enviar",askPlaceholder:"Pergunte sobre a empresa…",offer:"O que vocês oferecem?",pricing:"Preços",hours:"Horários",footer:"As conversas podem ser associadas a uma solicitação enviada. Agendamentos precisam de confirmação.",count:"ofertas",one:"oferta",askThis:"Perguntar sobre isto",priceOnRequest:"Preço sob consulta",notListed:"Esta empresa ainda não cadastrou produtos ou serviços. Você pode entrar em contato abaixo.",unavailable:"Assistente temporariamente indisponível",loading:"Consultando…",welcomeChat:"Olá! Bem-vindo à {name}! Posso ajudar com serviços, preços e informações da empresa. Como posso ajudar?",closed:"Conversa encerrada · Envie uma solicitação",endNote:"Você atingiu o limite de mensagens. Deixe telefone ou e-mail para a empresa continuar o atendimento.",received:"Sua solicitação foi recebida pela empresa {name}."},
 es:{welcome:"BIENVENIDO",readMore:"Ver más",readLess:"Ver menos",products:"Productos y servicios",contact:"Solicitar información o una cita",contactDescription:"Envía tu solicitud a la empresa. El historial del chat puede asociarse a tu mensaje. Las citas requieren confirmación.",name:"Tu nombre",email:"Correo electrónico",phone:"Teléfono (o correo)",type:"Tipo de solicitud",message:"¿Cómo podemos ayudarte?",send:"Enviar solicitud",information:"Información",appointment:"Solicitar cita",callback:"Solicitar llamada",quote:"Solicitar presupuesto",preferredTime:"Fecha y hora preferidas",askQuote:"Solicitar presupuesto",askAppointment:"Solicitar cita",chatSend:"Enviar",askPlaceholder:"Pregunta sobre la empresa…",offer:"¿Qué ofrecen?",pricing:"Precios",hours:"Horarios",footer:"Las conversaciones pueden asociarse a una solicitud. Las citas deben confirmarse.",count:"ofertas",one:"oferta",askThis:"Preguntar sobre esto",priceOnRequest:"Precio a consultar",notListed:"Esta empresa todavía no ha publicado productos o servicios. Puedes contactarla abajo.",unavailable:"Asistente temporalmente no disponible",loading:"Consultando…",welcomeChat:"¡Hola! Bienvenido a {name}. Puedo ayudarte con servicios, precios e información del negocio. ¿En qué puedo ayudarte?",closed:"Chat finalizado · Envía una solicitud",endNote:"Has alcanzado el límite de mensajes. Deja un teléfono o correo para que la empresa continúe atendiéndote.",received:"Tu solicitud ha sido recibida por {name}."}
};
const i18n=key=>(terms[pageLocale]||terms.en)[key]||terms.en[key]||key;
const format=(key,name)=>i18n(key).replace("{name}",name||"");
function resolveLocale(country,staffLanguage){
 if(country==="BR")return"pt";
 if(country==="ES")return"es";
 const primary=String(staffLanguage||navigator.languages?.[0]||navigator.language||"").toLowerCase();
 return primary.startsWith("pt")?"pt":primary.startsWith("es")?"es":"en";
}
function translateStore(){
 document.documentElement.lang=pageLocale==="pt"?"pt-BR":pageLocale==="es"?"es-ES":"en";
 const labels={welcomeTag:"welcome",productsHeading:"products",contactHeading:"contact",contactDescription:"contactDescription",nameLabel:"name",emailLabel:"email",phoneLabel:"phone",typeLabel:"type",messageLabel:"message",contactSend:"send",askQuote:"askQuote",askAppointment:"askAppointment",chatSend:"chatSend",chatFoot:"footer"};
 for(const [id,key] of Object.entries(labels))if($(id))$(id).textContent=i18n(key);
 const options={information:"information",appointment:"appointment",callback:"callback",quote:"quote"};
 for(const [value,key] of Object.entries(options))$('requestType').querySelector('[value="'+value+'"]').textContent=i18n(key);
 const preferred=$('preferredTimeWrap');if(preferred?.firstChild?.nodeType===Node.TEXT_NODE)preferred.firstChild.nodeValue=i18n("preferredTime");
 const quick=document.querySelectorAll('[data-ask]');
 [i18n("offer"),i18n("pricing"),i18n("hours")].forEach((value,i)=>{if(quick[i]){quick[i].textContent=value;quick[i].dataset.ask=pageLocale==="pt"?["Quais produtos ou serviços vocês oferecem?","Quais são os preços?","Qual é o horário de funcionamento?"][i]:pageLocale==="es"?["¿Qué productos o servicios ofrecen?","¿Cuáles son sus precios?","¿Cuál es su horario?"][i]:["What do you offer?","Can you explain your prices?","What are your business hours?"][i]}});
 $("question").placeholder=i18n("askPlaceholder");
 $("introToggle").textContent=i18n("readMore");
}
const INTRO_LIMIT=100;
let introExpanded=false;
function previewDescription(description,limit=INTRO_LIMIT){
 const value=String(description||"").trim();
 if(value.length<=limit)return{text:value,truncated:false};
 let cut=value.lastIndexOf(" ",limit);
 if(cut<Math.floor(limit*.65))cut=limit;
 return{text:value.slice(0,cut).trimEnd()+"…",truncated:true};
}
function renderDescription(){
 const full=String(store?.description||"").trim();
 const value=full||({pt:"Conheça nossos produtos e serviços.",es:"Conoce nuestros productos y servicios.",en:"Explore our products and services."}[pageLocale]);
 const preview=previewDescription(value);
 const expanded=preview.truncated&&introExpanded;
 $("intro").textContent=expanded?value:preview.text;
 const button=$("introToggle");
 button.classList.toggle("hidden",!preview.truncated);
 button.textContent=i18n(expanded?"readLess":"readMore");
 button.setAttribute("aria-expanded",String(expanded));
}

const sessionKey='nexus_chat_'+slug+'_'+sourceCode;
try{sessionId=localStorage.getItem(sessionKey)||null}catch{}
const showFailure=text=>{$("storeUnavailable").textContent=text;$("storeUnavailable").classList.remove("hidden");$("storeContent").classList.add("hidden")};
const safeUrl=value=>{try{const v=new URL(value);return v.protocol==="https:"?v.href:""}catch{return""}};
async function load(){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){showFailure("This store link is invalid.");return}
 try{
  const res=await fetch("/.netlify/functions/public-store?slug="+encodeURIComponent(slug)+(sourceCode?"&src="+encodeURIComponent(sourceCode):""),{cache:"no-store"});
  const data=await res.json();
  if(!res.ok||!data.store)throw Error("This store is not available yet. Please contact the business directly.");
  store=data.store;items=data.offerings||[];ready=data.chatReady===true;
  employee=data.employee||null;
  pageLocale=resolveLocale(data.visitorCountry,employee?.language);
  translateStore();
  if(employee){
   const box=$("employeeContact");box.classList.remove("hidden");
   const label=document.createElement("strong");
   label.textContent=(pageLocale==="pt"?"Seu vendedor: ":pageLocale==="es"?"Tu vendedor: ":"Your salesperson: ")+employee.name+" ";
   const link=document.createElement("a");link.href=employee.whatsappUrl;link.target="_blank";link.rel="noopener noreferrer";
   link.textContent=pageLocale==="pt"?"Falar no WhatsApp":pageLocale==="es"?"Hablar por WhatsApp":"Open WhatsApp";box.replaceChildren(label,link);
  }

  remaining=store.chatMaxMessages||10;
  if(data.qrSource){$('headline').textContent=data.qrSource.label+' • '+(store.headline||store.name);const p=items.find(x=>x.id===data.qrSource.offeringId);if(p)$('customerMessage').value='I would like information about '+p.name+'.';}
  $('requestType').querySelector('[value=appointment]').disabled=store.appointmentsEnabled===false;
  $("storeUnavailable").classList.add("hidden");$("storeContent").classList.remove("hidden");
  document.title=store.name+" · SmartStore";
  $("businessName").textContent=store.name;
  if(!data.qrSource)$("headline").textContent=store.headline||(pageLocale==="pt"?"Bem-vindo à "+store.name:pageLocale==="es"?"Bienvenido a "+store.name:"Welcome to "+store.name);
  introExpanded=false;renderDescription();
  const cover=safeUrl(store.store_image_url||"");
  if(cover)$("hero").style.backgroundImage="linear-gradient(90deg,#063d32c9,#063d3266),url("+JSON.stringify(cover)+")";
  $("count").textContent=items.length+" "+(items.length===1?i18n("one"):i18n("count"));
  $("assistantName").textContent=store.agent_name||"Business AI Assistant";
  $("chatStatus").textContent=ready?(pageLocale==="pt"?"IA ativa · "+remaining+" mensagens disponíveis":pageLocale==="es"?"IA activa · "+remaining+" mensajes disponibles":"Live AI · "+remaining+" messages available"):i18n("unavailable");
  $("welcome").textContent=ready?format("welcomeChat",store.name):(pageLocale==="pt"?"O assistente está indisponível. Entre em contato pelo formulário abaixo.":pageLocale==="es"?"El asistente no está disponible. Usa el formulario de contacto.":"Our AI assistant is temporarily unavailable. Please use the contact form below to reach the business.");
  $("question").disabled=!ready;$("chatSend").disabled=!ready;
  document.querySelectorAll("[data-ask]").forEach(btn=>btn.disabled=!ready);
  $("products").innerHTML=items.length?items.map(p=>'<article class="item">'+
   (safeUrl(p.image_url)?'<img alt="" src="'+esc(p.image_url)+'">':'<div class="placeholder">✦</div>')+
   '<div class="item-body"><h3>'+esc(p.name)+'</h3><span class="status">'+esc(p.type)+' · '+esc(p.status)+'</span><div class="price">'+esc(p.price_label||i18n("priceOnRequest"))+'</div>'+
   '<p>'+esc(p.description||"")+'</p><button class="btn" type="button" data-interested="'+esc(p.id)+'">'+esc(i18n("askThis"))+'</button></div></article>').join(""):
   '<div class="empty">'+esc(i18n("notListed"))+'</div>';
  document.querySelectorAll("[data-interested]").forEach(b=>b.onclick=()=>{
   const p=items.find(x=>x.id===b.dataset.interested);
   requestQuote(p?.name||"an offering");
  });
 }catch(e){showFailure(e.message||"Store temporarily unavailable")}
}
function bubble(role,message){
 const el=document.createElement("div");el.className="bubble "+(role==="user"?"user":"bot");el.textContent=String(message).slice(0,2500);$("chatFeed").appendChild(el);$("chatFeed").scrollTop=$("chatFeed").scrollHeight;return el;
}
async function ask(question){
 if(!ready||working||chatClosed)return;question=String(question||"").trim().slice(0,700);if(!question)return;
 working=true;$("question").disabled=true;$("chatSend").disabled=true;
 bubble("user",question);$("question").value="";const pending=bubble("bot",i18n("loading"));
 try{
  const r=await fetch("/.netlify/functions/store-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,message:question,sessionId,sourceCode})});
  const data=await r.json().catch(()=>({}));
  if(data.limitReached&&!r.ok){endChat();pending.textContent=data.error||"Chat limit reached. Leave a callback request below.";return}
  if(!r.ok||!data.reply)throw Error("Assistant unavailable");
  pending.textContent=data.reply;
  if(data.sessionId){sessionId=data.sessionId;try{localStorage.setItem(sessionKey,sessionId)}catch{}}
  remaining=Number.isInteger(data.remaining)?data.remaining:remaining;
  $('chatStatus').textContent=remaining+(pageLocale==='pt'?' mensagens restantes':pageLocale==='es'?' mensajes restantes':' messages remaining');
  if(data.limitReached)endChat();
  history.push({role:"user",content:question},{role:"assistant",content:data.reply});history=history.slice(-8);
 }catch{pending.textContent="I can't answer right now. Please send your question through the contact form and the business can follow up."}
 finally{working=false;$("question").disabled=!ready||chatClosed;$("chatSend").disabled=!ready||chatClosed;$("chatFeed").scrollTop=$("chatFeed").scrollHeight}
}
function endChat(){
 chatClosed=true;$('question').disabled=true;$('chatSend').disabled=true;
 $('chatStatus').textContent=i18n('closed');
 $('chatFoot').textContent=i18n('endNote');
 $('contact').scrollIntoView({behavior:'smooth',block:'start'});
}
$('requestType').onchange=()=>{$('preferredTimeWrap').classList.toggle('hidden',$('requestType').value!=='appointment')};
function requestQuote(name){
 if(name&&name!=="a quote"&&!$("customerMessage").value.trim())$("customerMessage").value="I'd like information about "+name+".";
 $("contact").scrollIntoView({behavior:"smooth",block:"start"});
 $("customerName").focus({preventScroll:true});
}
async function submitInquiry(e){
 e.preventDefault();if(!store)return;
 const name=$("customerName").value.trim(),email=$("customerEmail").value.trim(),phone=$("customerPhone").value.trim(),interest=$("customerMessage").value.trim();
 if(!email&&!phone){$('contactStatus').textContent='Provide a phone number or email address so the business can reply.';return}
 const send=$("contactSend");send.disabled=true;$("contactStatus").textContent="Saving your inquiry…";
 try{
  const r=await fetch("/.netlify/functions/store-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,name,email,phone,interest,sessionId,sourceCode,requestType:$("requestType").value,preferredTime:$("preferredTime").value,honeypot:$("hp").value})});
  const data=await r.json().catch(()=>({}));
  if(r.status!==201||data.accepted!==true)throw Error(data.error||"The message was not saved");
  $("contactStatus").textContent=employee&&pageLocale==="pt"?"Sua solicitação foi recebida pela loja e atribuída ao vendedor "+employee.name+".":format("received",store.name);
  $("contactForm").reset();
 }catch(e){$("contactStatus").textContent=e.message||"Your inquiry could not be saved. Please try again."}
 finally{send.disabled=false}
}
$("chatForm").onsubmit=e=>{e.preventDefault();ask($("question").value)};
document.querySelectorAll("[data-ask]").forEach(btn=>btn.onclick=()=>ask(btn.dataset.ask));
$("askQuote").onclick=()=>{$("requestType").value="quote";requestQuote("a quote")};
$("askAppointment").onclick=()=>{$("requestType").value="appointment";$("requestType").dispatchEvent(new Event("change"));requestQuote("an appointment")};
$("contactForm").onsubmit=submitInquiry;
$("introToggle").onclick=()=>{introExpanded=!introExpanded;renderDescription()};
load();
