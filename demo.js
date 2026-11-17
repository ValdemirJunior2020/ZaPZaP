// Public interactive demonstration. No signup, cookies or tenant data required.
const $=id=>document.getElementById(id);
const businesses={
 auto:{name:"SunHarbor Auto",agent:"Alex",intro:"Hi! I'm Alex from SunHarbor Auto. Ask me about our sample vehicles, pricing, or trade-in consultation.",description:"Helping customers compare vehicles and request a test drive.",catalog:[["2024 Harborline Compact SUV","$24,900 (example)"],["2023 Seabreeze Sedan","$18,750 (example)"]],questions:[["SUV pricing","Which SUV do you offer and what does it cost?"],["Compare vehicles","What's the difference between the SUV and sedan?"],["Trade-in","Can I get a trade-in consultation?"]]},
 beauty:{name:"Velora Beauty",agent:"Mia",intro:"Welcome to Velora Beauty! Ask about our sample hair and facial services.",description:"Helping clients discover services and understand sample pricing.",catalog:[["Signature haircut & style","From $65 (example)"],["Hydrating facial","$95 (example)"]],questions:[["Haircut pricing","How much is a haircut and style?"],["Facials","What does your hydrating facial include?"],["Studio hours","When is the studio open?"]]},
 hvac:{name:"NorthPeak HVAC",agent:"Sam",intro:"Hi! I'm Sam from NorthPeak HVAC. Ask about our sample heating and cooling services.",description:"Explaining service options, sample prices and appointment details.",catalog:[["AC tune-up","From $89 (example)"],["Heating inspection","From $99 (example)"]],questions:[["AC tune-up","What does your AC tune-up cost?"],["Heating","Do you inspect heating systems?"],["Availability","What hours can I schedule service?"]]}
};
const root=$("liveDemo");if(root){
 let current="auto",history=[],busy=false;
 const messages=$("demoMessages"),form=$("demoChatForm"),status=$("demoStatus"),question=$("demoQuestion"),send=$("demoSend");
 function bubble(role,content){const p=document.createElement("div");p.className="demo-bubble "+role;p.textContent=content;messages.appendChild(p);messages.scrollTop=messages.scrollHeight;return p}
 function select(business){
  if(busy||!businesses[business])return;current=business;history=[];const info=businesses[business];
  for(const button of document.querySelectorAll("#demoIndustries button")){const active=button.dataset.business===business;button.classList.toggle("active",active);button.setAttribute("aria-pressed",String(active))}
  $("demoAgentName").textContent=info.agent+" • "+info.name;
  const details=$("demoDetails");details.replaceChildren();
  const eyebrow=document.createElement("span");eyebrow.className="demo-panel-eyebrow";eyebrow.textContent="EXAMPLE CATALOG";details.appendChild(eyebrow);
  const h=document.createElement("h3");h.textContent=info.name;details.appendChild(h);
  const d=document.createElement("p");d.textContent=info.description;details.appendChild(d);
  for(const [label,cost] of info.catalog){const line=document.createElement("div");line.className="demo-catalog-item";const title=document.createElement("strong");title.textContent=label;const price=document.createElement("span");price.textContent=cost;line.append(title,price);details.appendChild(line)}
  messages.replaceChildren();bubble("assistant",info.intro);
  const suggestions=$("demoSuggestions");suggestions.replaceChildren();
  for(const [label,text]of info.questions){const b=document.createElement("button");b.type="button";b.textContent=label;b.dataset.question=text;suggestions.appendChild(b)}
  status.textContent="Example business only • Real responses powered by Ollama Qwen3.";
 }
 $("demoIndustries").addEventListener("click",e=>{const button=e.target.closest("button[data-business]");if(button)select(button.dataset.business)});
 $("demoSuggestions").addEventListener("click",e=>{const button=e.target.closest("button[data-question]");if(button&&!busy){question.value=button.dataset.question;form.requestSubmit()}});
 form.addEventListener("submit",async e=>{
  e.preventDefault();const message=question.value.trim();if(busy||!message||message.length>350)return;
  const selected=current;busy=true;send.disabled=true;question.disabled=true;
  bubble("user",message);question.value="";const pending=bubble("assistant","Thinking…");status.textContent="Asking the real Qwen3 model…";
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),23000);
  try{
   const response=await fetch("/.netlify/functions/demo-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({business:selected,message,history:history.slice(-6)}),signal:controller.signal});
   const data=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(data.error||"The live demo is currently unavailable.");
   if(!data.reply||data.source!=="ollama"||data.business!==selected)throw Error("The live demo did not return a verified reply.");
   pending.textContent=data.reply;
   history.push({role:"user",content:message},{role:"assistant",content:data.reply});history=history.slice(-6);
   status.textContent="Answered by Qwen3 • Fictional business information.";
  }catch(error){
   pending.textContent=error.name==="AbortError"?"Qwen3 took too long to respond. Please try again.":error.message;
   status.textContent="No simulated answer was substituted. Real Qwen3 responses only.";
  }finally{clearTimeout(timeout);busy=false;send.disabled=false;question.disabled=false;messages.scrollTop=messages.scrollHeight}
 });
 select("auto");
 fetch("/.netlify/functions/demo-chat",{cache:"no-store"}).then(r=>r.json()).then(j=>{const online=$("demoOnline");online.textContent=j.configured?"AI configured":"AI offline";online.classList.toggle("online",Boolean(j.configured))}).catch(()=>{$("demoOnline").textContent="AI offline"});
}
