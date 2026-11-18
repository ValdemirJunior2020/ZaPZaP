const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=(()=>{const match=location.pathname.match(/^\/s\/([a-z0-9-]{3,50})\/?$/i);return match?match[1]:new URLSearchParams(location.search).get("slug")||new URLSearchParams(location.search).get("s")||""})();
let employee=null,store=null,items=[],history=[],ready=false,working=false,chatClosed=false,sessionId=null,remaining=10,sourceCode=new URLSearchParams(location.search).get('src')||'';
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
  if(employee){
   document.documentElement.lang=employee.language==="pt_BR"?"pt-BR":employee.language==="es_ES"?"es":"en";
   const pt=employee.language==="pt_BR",es=employee.language==="es_ES";
   const box=$("employeeContact");box.classList.remove("hidden");
   const label=document.createElement("strong");label.textContent=(pt?"Seu vendedor: ":es?"Tu vendedor: ":"Your salesperson: ")+employee.name+" ";
   const link=document.createElement("a");link.href=employee.whatsappUrl;link.target="_blank";link.rel="noopener noreferrer";link.textContent=pt?"Falar no WhatsApp":es?"Hablar por WhatsApp":"Open WhatsApp";box.append(label,link);
   $("question").placeholder=pt?"Pergunte sobre a loja…":es?"Pregunta sobre la tienda…":"Ask about this business…";
   $("requestType").querySelector('[value="callback"]').textContent=pt?"Solicitar retorno do vendedor":es?"Solicitar llamada":"Request employee callback";
   $("requestType").querySelector('[value="quote"]').textContent=pt?"Solicitar orçamento":es?"Solicitar presupuesto":"Request quote";
   $("contactSend").textContent=pt?"Enviar solicitação":es?"Enviar solicitud":"Send inquiry";
  }

  remaining=store.chatMaxMessages||10;
  if(data.qrSource){$('headline').textContent=data.qrSource.label+' • '+(store.headline||store.name);const p=items.find(x=>x.id===data.qrSource.offeringId);if(p)$('customerMessage').value='I would like information about '+p.name+'.';}
  $('requestType').querySelector('[value=appointment]').disabled=store.appointmentsEnabled===false;
  $("storeUnavailable").classList.add("hidden");$("storeContent").classList.remove("hidden");
  document.title=store.name+" · SmartStore";
  $("businessName").textContent=store.name;
  if(!data.qrSource)$("headline").textContent=store.headline||"Welcome to "+store.name;
  $("intro").textContent=store.description||"Explore our products and services.";
  const cover=safeUrl(store.store_image_url||"");
  if(cover)$("hero").style.backgroundImage="linear-gradient(90deg,#063d32c9,#063d3266),url("+JSON.stringify(cover)+")";
  $("count").textContent=items.length+" offering"+(items.length===1?"":"s");
  $("assistantName").textContent=store.agent_name||"Business AI Assistant";
  $("chatStatus").textContent=ready?"Live AI · "+remaining+" messages available":"Assistant temporarily unavailable";
  $("welcome").textContent=ready?(employee?.language==="pt_BR"?"Olá! Bem-vindo ao "+store.name+". Sou a assistente virtual de "+employee.name+". Como posso ajudar?":employee?.language==="es_ES"?"¡Hola! Bienvenido a "+store.name+". Soy el asistente de "+employee.name+". ¿En qué puedo ayudarte?":"Hi! Welcome to "+store.name+"! I can help with our services, pricing and business information. What would you like to know?"):"Our AI assistant is temporarily unavailable. Please use the contact form below to reach the business.";
  $("question").disabled=!ready;$("chatSend").disabled=!ready;
  document.querySelectorAll("[data-ask]").forEach(btn=>btn.disabled=!ready);
  $("products").innerHTML=items.length?items.map(p=>'<article class="item">'+
   (safeUrl(p.image_url)?'<img alt="" src="'+esc(p.image_url)+'">':'<div class="placeholder">✦</div>')+
   '<div class="item-body"><h3>'+esc(p.name)+'</h3><span class="status">'+esc(p.type)+' · '+esc(p.status)+'</span><div class="price">'+esc(p.price_label||"Price on request")+'</div>'+
   '<p>'+esc(p.description||"")+'</p><button class="btn" type="button" data-interested="'+esc(p.id)+'">Ask about this</button></div></article>').join(""):
   '<div class="empty">This business has not listed any offerings yet. You can still contact them below.</div>';
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
 bubble("user",question);$("question").value="";const pending=bubble("bot","Looking that up…");
 try{
  const r=await fetch("/.netlify/functions/store-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,message:question,sessionId,sourceCode})});
  const data=await r.json().catch(()=>({}));
  if(data.limitReached&&!r.ok){endChat();pending.textContent=data.error||"Chat limit reached. Leave a callback request below.";return}
  if(!r.ok||!data.reply)throw Error("Assistant unavailable");
  pending.textContent=data.reply;
  if(data.sessionId){sessionId=data.sessionId;try{localStorage.setItem(sessionKey,sessionId)}catch{}}
  remaining=Number.isInteger(data.remaining)?data.remaining:remaining;
  $('chatStatus').textContent=remaining+' messages remaining';
  if(data.limitReached)endChat();
  history.push({role:"user",content:question},{role:"assistant",content:data.reply});history=history.slice(-8);
 }catch{pending.textContent="I can't answer right now. Please send your question through the contact form and the business can follow up."}
 finally{working=false;$("question").disabled=!ready||chatClosed;$("chatSend").disabled=!ready||chatClosed;$("chatFeed").scrollTop=$("chatFeed").scrollHeight}
}
function endChat(){
 chatClosed=true;$('question').disabled=true;$('chatSend').disabled=true;
 $('chatStatus').textContent='Chat finished · Send contact request';
 $('chatFoot').textContent='Your chat limit has been reached. Leave your phone number or email and the business can continue helping.';
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
  $("contactStatus").textContent=employee?.language==="pt_BR"?"Sua solicitação foi recebida pela loja e atribuída ao vendedor "+employee.name+".":"Your request has been received and saved for "+store.name+". The business can review it and follow up.";
  $("contactForm").reset();
 }catch(e){$("contactStatus").textContent=e.message||"Your inquiry could not be saved. Please try again."}
 finally{send.disabled=false}
}
$("chatForm").onsubmit=e=>{e.preventDefault();ask($("question").value)};
document.querySelectorAll("[data-ask]").forEach(btn=>btn.onclick=()=>ask(btn.dataset.ask));
$("askQuote").onclick=()=>{$("requestType").value="quote";requestQuote("a quote")};
$("askAppointment").onclick=()=>{$("requestType").value="appointment";$("requestType").dispatchEvent(new Event("change"));requestQuote("an appointment")};
$("contactForm").onsubmit=submitInquiry;
load();
