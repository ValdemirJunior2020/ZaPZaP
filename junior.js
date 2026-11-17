// Hope: shareable mobile-first AI page. WhatsApp is only a place where a link can be shared.
const $=id=>document.getElementById(id);
const sessionKey="nexus_hope_session_v1";
let sessionId=null,remaining=10,busy=false,ended=false,available=false,slug="";
try{sessionId=localStorage.getItem(sessionKey)||null}catch{}
const speak=(role,msg)=>{
 const line=document.createElement("div");line.className="bubble "+(role==="me"?"me":"bot");line.textContent=String(msg||"").slice(0,2500);
 $("messages").append(line);$("messages").scrollTop=$("messages").scrollHeight;return line;
};
const stop=()=>{ended=true;$("question").disabled=true;$("send").disabled=true;$("status").textContent="Session finished";$("chatFoot").textContent="Thanks for chatting! If you'd like Junior to follow up, leave your name and email or phone number below.";$("contact").classList.add("open");$("contactToggle").setAttribute("aria-expanded","true")};
async function initialize(){
 try{
  const r=await fetch("/.netlify/functions/store-chat?experience=junior",{cache:"no-store"});
  const data=await r.json().catch(()=>({}));
  if(!r.ok||!data.slug)throw Error("This assistant is unavailable right now");
  slug=data.slug;available=data.online===true;remaining=data.limit||10;
  $("status").textContent=available?"AI ready":"AI offline";
  if(!available){$("chatFoot").textContent="The AI is currently offline. You can still leave Junior a message below."}
  $("question").disabled=!available;$("send").disabled=!available;
 }catch(e){$("status").textContent="Offline";$("question").disabled=true;$("send").disabled=true;$("chatFoot").textContent="The assistant is currently unavailable. Please use the contact form below."}
}
async function ask(question){
 if(!available||busy||ended)return;
 question=String(question||"").trim().slice(0,700);if(!question)return;
 busy=true;$("question").value="";$("question").disabled=true;$("send").disabled=true;
 speak("me",question);const response=speak("bot","Thinking…");
 try{
  const r=await fetch("/.netlify/functions/store-chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experience:"junior",message:question,sessionId})});
  const data=await r.json().catch(()=>({}));
  if(data.limitReached&&!r.ok){response.textContent=data.error||"The chat has reached its limit.";stop();return}
  if(!r.ok||!data.reply)throw Error(data.error||"No reply is available");
  response.textContent=data.reply;
  if(data.sessionId){sessionId=data.sessionId;try{localStorage.setItem(sessionKey,sessionId)}catch{}}
  if(Number.isInteger(data.remaining))remaining=data.remaining;
  $("status").textContent=remaining+" messages left";
  if(data.limitReached)stop();
 }catch(e){response.textContent="I'm having trouble responding right now. You can still leave a message for Junior below."}
 finally{busy=false;if(!ended){$("question").disabled=!available;$("send").disabled=!available;$("question").focus()}$("messages").scrollTop=$("messages").scrollHeight}
}
$("messageForm").onsubmit=e=>{e.preventDefault();ask($("question").value)};
$("question").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("messageForm").requestSubmit()}};
document.querySelectorAll("[data-prompt]").forEach(b=>b.onclick=()=>ask(b.dataset.prompt));
$("contactToggle").onclick=()=>{const open=$("contact").classList.toggle("open");$("contactToggle").setAttribute("aria-expanded",String(open));$("contactToggle").textContent=open?"Hide contact form":"Leave a message for Junior"};
$("leadForm").onsubmit=async e=>{
 e.preventDefault();
 const name=$("leadName").value.trim(),email=$("leadEmail").value.trim(),phone=$("leadPhone").value.trim(),interest=$("leadInterest").value.trim();
 if(!email&&!phone){$("leadStatus").textContent="Please include an email address or a phone number so Junior can reply.";return}
 if(interest.length<5){$("leadStatus").textContent="Please tell Junior a little about your request.";return}
 const button=$("leadSend");button.disabled=true;$("leadStatus").textContent="Sending your request…";
 try{
  const r=await fetch("/.netlify/functions/store-inquiry",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({experience:"junior",slug,sessionId,name,email,phone,interest,honeypot:$("website").value,requestType:"information"})});
  const result=await r.json().catch(()=>({}));
  if(r.status!==201||result.accepted!==true)throw Error(result.error||"Unable to send your request");
  $("leadStatus").textContent="Thank you! Your message was saved for Junior. He can review it and follow up.";
  $("leadForm").reset();
 }catch(err){$("leadStatus").textContent=err.message||"Sorry, we couldn't save your message. Please try again."}
 finally{button.disabled=false}
};
initialize();
