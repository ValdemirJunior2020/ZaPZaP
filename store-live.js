const $=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slug=(()=>{const match=location.pathname.match(/^\/s\/([a-z0-9-]{3,50})\/?$/i);return match?match[1]:new URLSearchParams(location.search).get("slug")||new URLSearchParams(location.search).get("s")||""})();
let store=null,items=[],history=[],ready=false,working=false;
const showFailure=text=>{$("storeUnavailable").textContent=text;$("storeUnavailable").classList.remove("hidden");$("storeContent").classList.add("hidden")};
const safeUrl=value=>{try{const v=new URL(value);return v.protocol==="https:"?v.href:""}catch{return""}};
async function load(){
 if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)){showFailure("This store link is invalid.");return}
 try{
  const res=await fetch("/.netlify/functions/public-store?slug="+encodeURIComponent(slug),{cache:"no-store"});
  const data=await res.json();
  if(!res.ok||!data.store)throw Error("This store is not available yet. Please contact the business directly.");
  store=data.store;items=data.offerings||[];ready=data.chatReady===true;
  $("storeUnavailable").classList.add("hidden");$("storeContent").classList.remove("hidden");
  document.title=store.name+" · SmartStore";
  $("businessName").textContent=store.name;
  $("headline").textContent=store.headline||"Welcome to "+store.name;
  $("intro").textContent=store.description||"Explore our products and services.";
  const cover=safeUrl(store.store_image_url||"");
  if(cover)$("hero").style.backgroundImage="linear-gradient(90deg,#063d32c9,#063d3266),url("+JSON.stringify(cover)+")";
  $("count").textContent=items.length+" offering"+(items.length===1?"":"s");
  $("assistantName").textContent=store.agent_name||"Business AI Assistant";
  $("chatStatus").textContent=ready?"Live AI · Ask me anything about this business":"Assistant temporarily unavailable";
  $("welcome").textContent=ready?"Hi! Welcome to "+store.name+"! I can help with our services, pricing and business information. What would you like to know?":"Our AI assistant is temporarily unavailable. Please use the contact form below to reach the business.";
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
 if(!ready||working)return;question=String(question||"").trim().slice(0,700);if(!question)return;
 working=true;$("question").disabled=true;$("chatSend").disabled=true;
 bubble("user",question);$("question").value="";const pending=bubble("bot","Looking that up…");
 try{
  const r=await fetch("/.netlify/functions/store-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,message:question,history:history.slice(-8)})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.reply)throw Error("Assistant unavailable");
  pending.textContent=data.reply;
  history.push({role:"user",content:question},{role:"assistant",content:data.reply});history=history.slice(-8);
 }catch{pending.textContent="I can't answer right now. Please send your question through the contact form and the business can follow up."}
 finally{working=false;$("question").disabled=!ready;$("chatSend").disabled=!ready;$("chatFeed").scrollTop=$("chatFeed").scrollHeight}
}
function requestQuote(name){
 if(name&&name!=="a quote"&&!$("customerMessage").value.trim())$("customerMessage").value="I'd like information about "+name+".";
 $("contact").scrollIntoView({behavior:"smooth",block:"start"});
 $("customerName").focus({preventScroll:true});
}
async function submitInquiry(e){
 e.preventDefault();if(!store)return;
 const name=$("customerName").value.trim(),email=$("customerEmail").value.trim(),phone=$("customerPhone").value.trim(),interest=$("customerMessage").value.trim();
 const send=$("contactSend");send.disabled=true;$("contactStatus").textContent="Saving your inquiry…";
 try{
  const r=await fetch("/.netlify/functions/store-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug,name,email,phone,interest,honeypot:$("hp").value})});
  const data=await r.json().catch(()=>({}));
  if(r.status!==201||data.accepted!==true)throw Error(data.error||"The message was not saved");
  $("contactStatus").textContent="Your request has been received and saved for "+store.name+". The business can review it and follow up.";
  $("contactForm").reset();
 }catch(e){$("contactStatus").textContent=e.message||"Your inquiry could not be saved. Please try again."}
 finally{send.disabled=false}
}
$("chatForm").onsubmit=e=>{e.preventDefault();ask($("question").value)};
document.querySelectorAll("[data-ask]").forEach(btn=>btn.onclick=()=>ask(btn.dataset.ask));
$("askQuote").onclick=()=>requestQuote("a quote");
$("contactForm").onsubmit=submitInquiry;
load();
