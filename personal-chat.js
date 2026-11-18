const $=id=>document.getElementById(id);
const handle=decodeURIComponent(location.pathname.split("/").filter(Boolean).pop()||"");
const valid=/^[a-z][a-z0-9-]{2,31}$/.test(handle)&&!/--|-$/.test(handle);
const key="nexus_personal_session_"+handle;
let sessionId=null,ready=false,closed=false,busy=false,assistant=null;
try{sessionId=localStorage.getItem(key)||null}catch{}
function bubble(type,text){const div=document.createElement("div");div.className="bubble "+type;div.textContent=String(text||"").slice(0,2500);$("feed").append(div);$("feed").scrollTop=$("feed").scrollHeight;return div}
function end(){closed=true;$("question").disabled=true;$("send").disabled=true;$("status").textContent="Chat finished";$("foot").textContent="Session limit reached. You may leave a contact request below.";$("contact").classList.add("open");$("toggle").setAttribute("aria-expanded","true")}
async function init(){
 if(!valid){$("status").textContent="Invalid link";return}
 try{
  const r=await fetch("/.netlify/functions/store-chat?assistantHandle="+encodeURIComponent(handle),{cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.assistant)throw Error("Assistant unavailable");
  assistant=data.assistant;
  $("heroName").textContent=assistant.name;
  $("chatName").textContent=assistant.name+" · AI";
  $("chatStyle").textContent=assistant.style||"Personal assistant";
  $("welcome").textContent=assistant.greeting||"Hi! I'm "+assistant.name+", your AI assistant. How can I help?";
  ready=data.online===true;$("status").textContent=ready?"Available":"AI offline";
  $("question").disabled=!ready;$("send").disabled=!ready;
 }catch{$("status").textContent="Unavailable";$("foot").textContent="Assistant is currently unavailable. You can reach the owner another way."}
}
async function ask(raw){
 const message=String(raw||"").trim().slice(0,700);if(!message||!ready||busy||closed)return;
 busy=true;$("question").value="";$("question").disabled=true;$("send").disabled=true;
 bubble("visitor",message);const pending=bubble("bot","Thinking…");
 try{
  const r=await fetch("/.netlify/functions/store-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experience:"personal",assistantHandle:handle,sessionId,message})});
  const data=await r.json().catch(()=>({}));
  if(!r.ok&&data.limitReached){pending.textContent=data.error||"Chat limit reached";end();return}
  if(!r.ok||!data.reply)throw Error("Assistant unavailable");
  pending.textContent=data.reply;
  if(data.sessionId){sessionId=data.sessionId;try{localStorage.setItem(key,sessionId)}catch{}}
  if(Number.isInteger(data.remaining))$("status").textContent=data.remaining+" messages left";
  if(data.limitReached)end();
 }catch{pending.textContent="Sorry, I can't answer right now. You can leave a message for the owner below."}
 finally{busy=false;if(!closed){$("question").disabled=!ready;$("send").disabled=!ready} $("feed").scrollTop=$("feed").scrollHeight}
}
$("askForm").onsubmit=e=>{e.preventDefault();ask($("question").value)};
$("question").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("askForm").requestSubmit()}};
document.querySelectorAll("[data-ask]").forEach(el=>el.onclick=()=>ask(el.dataset.ask));
$("toggle").onclick=()=>{const open=$("contact").classList.toggle("open");$("toggle").setAttribute("aria-expanded",String(open))};
$("leadForm").onsubmit=async e=>{
 e.preventDefault();const name=$("leadName").value.trim(),email=$("leadEmail").value.trim(),phone=$("leadPhone").value.trim(),interest=$("leadMessage").value.trim();
 if(!email&&!phone){$("leadStatus").textContent="Enter an email address or phone number.";return}
 const button=$("submitLead");button.disabled=true;$("leadStatus").textContent="Sending…";
 try{
  const r=await fetch("/.netlify/functions/store-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experience:"personal",assistantHandle:handle,sessionId,name,email,phone,interest,honeypot:$("website").value})});
  const data=await r.json().catch(()=>({}));if(r.status!==201||data.accepted!==true)throw Error(data.error||"Could not save request");
  $("leadStatus").textContent="Request received! The owner can follow up.";$("leadForm").reset();
 }catch(error){$("leadStatus").textContent=error.message}finally{button.disabled=false}
};
init();