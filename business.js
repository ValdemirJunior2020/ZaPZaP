const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanSlug=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,48);
let cfg=null,signingUp=false,accountKind="business",viewName="overview",workspace=null,busy=false;
const sessionKey="nexus_owner_v1";
const session=()=>{try{return JSON.parse(sessionStorage.getItem(sessionKey)||"null")}catch{return null}};
const saveSession=s=>{if(s)sessionStorage.setItem(sessionKey,JSON.stringify(s));else sessionStorage.removeItem(sessionKey)};
const toast=s=>{$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),3400)};
const text=(id,value)=>{const e=$(id);if(e)e.textContent=value};
function setVisible(loggedIn){
 $("marketing").classList.toggle("hidden",loggedIn);$("signupArea").classList.toggle("hidden",loggedIn);
 $("features").classList.toggle("hidden",loggedIn);$("pricing").classList.toggle("hidden",loggedIn);$("liveDemo")?.classList.toggle("hidden",loggedIn);
 $("workspace").classList.toggle("hidden",!loggedIn);$("topnav").classList.toggle("hidden",loggedIn);$("accountTop").classList.toggle("hidden",!loggedIn);
}
function authFields(){
 const personal=accountKind==="personal";
 $("accountTypePicker").classList.toggle("hidden",!signingUp);
 $("businessInputs").classList.toggle("hidden",!signingUp);
 $("authPhoneWrap").classList.toggle("hidden",!signingUp||personal);
 $("authBusiness").required=signingUp;$("authPhone").required=signingUp&&!personal;
 text("authNameLabel",personal?"Your name":"Business name");
 $("authBusiness").placeholder=personal?"Your name":"e.g. Sunshine Marketing Studio";
 document.querySelectorAll("[data-account-kind]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.accountKind===accountKind)));
 text("authHeading",signingUp?(personal?"Create your personal AI account":"Create your business account"):"Welcome back");
 text("authSub",signingUp?(personal?"Start with your own AI web assistant. No business or payment card is required. Your 48-hour trial begins only when you activate the working assistant.":"Add your business details to get started. Your 48-hour trial begins when your AI store goes live."):"Sign in to NexusSales AI.");
 text("authSubmit",signingUp?"Create account":"Sign in");
 text("switchAuth",signingUp?"Already have an account? Log in":"New to NexusSales? Create an account");
 $("authPassword").setAttribute("autocomplete",signingUp?"new-password":"current-password");
}
async function loadConfig(){
 try{
  const r=await fetch("/api/public-config",{cache:"no-store"});
  if(!r.ok)throw Error("Account service is not connected yet");
  const j=await r.json();
  if(!j.configured||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(j.supabaseUrl))throw Error("Account service unavailable");
  cfg=j;text("configMessage",signingUp?"Secure account service connected. Your 48-hour trial starts when your AI store goes live.":"Account connection ready. Log in with your existing NexusSales email and password.");
  $("configMessage").classList.add("success");$("authSubmit").disabled=false;
 }catch{
  cfg=null;text("configMessage",location.hostname==="localhost"||location.hostname==="127.0.0.1"?"Local account connection is missing. Add your Supabase development credentials to .env.local, restart npm start, and then log in with your existing NexusSales account.":"Account service is temporarily unavailable. Your existing account has not been removed.");$("configMessage").classList.remove("success");$("authSubmit").disabled=true;
 }
}
async function authRequest(endpoint,body){
 if(!cfg)throw Error("Account service is not connected");
 const r=await fetch(cfg.supabaseUrl+endpoint,{method:"POST",headers:{"Content-Type":"application/json",apikey:cfg.publishableKey},body:JSON.stringify(body),signal:AbortSignal.timeout(13000)});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(j.msg||j.error_description||j.message||"Unable to authenticate");
 return j;
}
async function refreshAuth(){
 const s=session();if(!s?.refresh_token)return false;
 try{
  const j=await authRequest("/auth/v1/token?grant_type=refresh_token",{refresh_token:s.refresh_token});
  if(!j.access_token)throw Error("Session ended");
  saveSession({...s,...j});return true
 }catch{saveSession(null);return false}
}
async function authHeader(){
 let s=session();if(!s)return null;
 if(s.expires_at&&Date.now()/1000>s.expires_at-60){if(!await refreshAuth())return null;s=session()}
 return{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token};
}
async function ownerApi(action,payload,allowRetry=true){
 let headers=await authHeader();if(!headers)throw Error("Please sign in again");
 const method=action?"POST":"GET";
 const url="/.netlify/functions/owner-workspace";
 const r=await fetch(url,{method,headers,body:action?JSON.stringify({action,...payload}):undefined,cache:"no-store"});
 const j=await r.json().catch(()=>({}));
 if(r.status===401&&allowRetry&&await refreshAuth())return ownerApi(action,payload,false);
 if(!r.ok)throw Error(j.error||"Unable to save changes");
 return j;
}
async function loadWorkspace({throwOnError=false}={}){
 try{
  workspace=await ownerApi();
  if(!workspace)throw Error("Unable to load account");
  if(workspace.accountKind==="personal"&&viewName==="overview")viewName="personal";
  setVisible(true);
  const currentLanguage=workspace.businessProfile?.interface_language||"en";
  window.NexusLanguage?.restoreLanguage(currentLanguage);
  window.NexusLanguage?.bindSave(async language=>{
   await ownerApi("set_interface_language",{language});
   if(workspace.businessProfile)workspace.businessProfile.interface_language=language;
   else workspace.businessProfile={interface_language:language};
  });
  window.NexusFlags?.render();
  text("accountLabel",workspace.email||"Account");
  text("sideName",workspace.store?.name||workspace.profile?.business_name||"Your business");
  document.querySelectorAll("[data-owner-only]").forEach(el=>el.hidden=workspace?.personalAssistantSpecial!==true);
  // Developer-only UI. Paid Business entitlement comes from owner-workspace, not browser pricing.
  const whatsappLocal=["localhost","127.0.0.1"].includes(location.hostname);
  const whatsappAllowed=whatsappLocal&&workspace?.whatsappLinkAllowed===true;
  document.querySelectorAll("[data-whatsapp-business]").forEach(el=>{el.hidden=!whatsappAllowed});
  if(viewName==="whatsappLink"&&!whatsappAllowed)viewName="overview";
  render();
  return true;
 }catch(e){toast(e.message);if(/sign in|session|invalid login|unauthorized/i.test(e.message)){saveSession(null);setVisible(false)}else{setVisible(true);$("viewContent").innerHTML='<div class="alert">Business data is temporarily unavailable. Your account has not been logged out. Refresh the page to retry.</div>'}if(throwOnError)throw e;return false}
}
function showConfirmationEmail(email){
 const node=$("authMsg");node.textContent="";
 const lead=document.createElement("span");lead.textContent="We've sent a verification link. Please check: ";node.append(lead);
 const address=document.createElement("strong");address.textContent=email;address.style.cssText="display:inline-block;background:#e1fbec;color:#075d45;border:1px solid #7fdab5;padding:5px 9px;border-radius:8px;font-weight:850";node.append(address);
 const instruction=document.createElement("span");instruction.textContent=" Check Inbox, Spam/Junk, and Promotions. Click Confirm Email, then return and sign in. Your trial starts only when your SmartStore goes live.";node.append(instruction);
 node.setAttribute("role","status");
}
async function submitAuth(e){
 e.preventDefault();if(busy||!cfg)return;
 const email=$("authEmail").value.trim(),password=$("authPassword").value;
 const name=$("authBusiness").value.trim(),phone=$("authPhone").value.trim();
 if(signingUp&&(name.length<2||(accountKind==="business"&&phone.replace(/\D/g,"").length<7))){text("authMsg",accountKind==="personal"?"Enter your name (at least two characters).":"Enter a business name and valid phone number.");return}
 busy=true;$("authSubmit").disabled=true;text("authMsg","Connecting…");
 try{
  const j=await authRequest(signingUp?"/auth/v1/signup":"/auth/v1/token?grant_type=password",
   {email,password,...(signingUp?{data:accountKind==="personal"?{display_name:name,account_kind:"personal"}:{business_name:name,phone,account_kind:"business"}}:{})});
  if(!j.access_token){
   showConfirmationEmail(email);
   return;
  }
  saveSession({...j,email,expires_at:j.expires_at||Math.floor(Date.now()/1000)+Number(j.expires_in||3600)});
  $("authPassword").value="";await loadWorkspace();
 }catch(err){text("authMsg",err.message)}
 finally{busy=false;$("authSubmit").disabled=!cfg}
}
function signOut(){saveSession(null);workspace=null;setVisible(false);window.scrollTo(0,0)}
function statusText(){
 const a=workspace?.access||{},r=a.reason;
 if(r==="COMPLIMENTARY")return"Lifetime complimentary access";
 if(r==="PAID")return"Subscription active";
 if(r==="TRIAL")return a.trialHoursLeft+" hours left in trial";
 if(r==="TRIAL_EXPIRED")return"Trial ended • subscription required";
 return"48-hour trial available";
}
function isEditable(){return workspace?.access?.reason!=="TRIAL_EXPIRED"&&workspace?.access?.reason!=="NO_ACCOUNT"}
const htmlEsc=escapeHtml;
const productName=p=>escapeHtml(p?.name||"Offering");

// Preserve unsaved form values when the platform language is switched.
// The language picker must not silently discard a partially edited SmartStore or assistant.
function snapshotActiveInputs(){
 const form=document.getElementById("viewContent");
 if(!form)return [];
 return [...form.querySelectorAll("input,select,textarea")].map((el,index)=>({
  index,id:el.id,name:el.name,type:el.type,value:el.value,checked:el.checked,
  start:typeof el.selectionStart==="number"&&/^(text|search|tel|url|email|textarea)$/i.test(el.type||el.tagName)?el.selectionStart:null
 }));
}
function restoreActiveInputs(snapshot){
 const root=document.getElementById("viewContent");
 if(!root)return;
 for(const field of snapshot){
  const found=field.id?document.getElementById(field.id):null;
  const el=found||[...root.querySelectorAll("input,select,textarea")][field.index];
  if(!el||el.type!==field.type||el.name!==field.name)continue;
  if(el.type==="checkbox"||el.type==="radio")el.checked=field.checked;
  else el.value=field.value;
 }
}

function render(){
 const titles={overview:["BUSINESS OVERVIEW","Your business command center","Set up and publish your SmartStore."],
 store:["BUSINESS SETTINGS","Set up your SmartStore","Teach the AI what your company does."],
 offerings:["PRODUCTS & SERVICES","What you sell","Enter your actual offerings, prices and details."],
 testbot:["TEST MY AI","Talk to your own AI salesperson","Preview real answers from your business catalog before publishing."],
 links:["TRACKED QR CODES","Turn foot traffic into leads","Create trackable QR codes for storefronts, vehicles, services and products."],
 widget:["WEBSITE CHATBOT","Add Chatbot to Your Website","One script to add your AI salesperson to your own website."],
 leads:["LEAD CENTER","Leads & conversations","Every inquiry, appointment request and captured conversation."],
 whatsappLink:["WHATSAPP CONNECTION","Link your WhatsApp","Connect your WhatsApp number to your Nexus AI assistant. Local testing only."],
 team:["TEAM MANAGEMENT","Equipe de vendedores","QR Code, WhatsApp e idioma de cada funcionário."],
 personal:["PERSONAL AI BUILDER","Build Your Personal Assistant","Customize your named AI, personality, and personal contact link."],
 logs:["AI DIAGNOSTICS","AI Error Logs","Recent chat failures, stages, and diagnostic reference IDs."],
 brazil:["SUPER ADMIN","Brazil & Global Plans","Proposed team and personal-assistant packages; billing is not enabled."],
 billing:["48-HOUR TRIAL & BILLING","Your subscription","Base US$499/month, website widget +US$79/month."]};
 const t=titles[viewName]||titles.overview;
 text("workspaceEyebrow",t[0]);text("workspaceHeading",t[1]);text("workspaceSubtitle",t[2]);text("trialBadge",statusText());
 document.querySelectorAll("[data-view]").forEach(b=>{b.classList.toggle("active",b.dataset.view===viewName)});
 const views={overview:renderOverview,store:renderStore,offerings:renderOfferings,testbot:renderTestBot,links:renderLinks,leads:renderLeads,whatsappLink:renderWhatsAppLink,widget:()=>"",team:renderTeam,personal:renderPersonalAssistant,logs:renderErrorLogs,brazil:renderMarketPlans,billing:renderBilling};
 if(viewName==="whatsappLink"&&(!["localhost","127.0.0.1"].includes(location.hostname)||workspace?.whatsappLinkAllowed!==true))viewName="overview";
 $("viewContent").innerHTML=(views[viewName]||views.overview)();
 bindView();
 if(viewName==="widget")window.NexusWidgetGuide?.render(workspace,ownerApi,loadWorkspace);
 if(viewName==="store")window.NexusBusinessProfile?.activate(workspace,ownerApi,loadWorkspace);
 window.NexusLanguage?.apply();
}
function renderWhatsAppLink(){
 // The bridge must remain loopback-only; this is not a public customer connection yet.
 if(!["localhost","127.0.0.1"].includes(location.hostname)||workspace?.whatsappLinkAllowed!==true)
   return '<div class="card">WhatsApp linking is available to active Business subscribers during local testing.</div>';
 return '<div class="card" style="max-width:900px"><span class="tag">BUSINESS PLAN · LOCAL TEST</span><h2>Connect your WhatsApp in Nexus</h2><p>Use your spare WhatsApp number for this test. Your AI responses stay off until you choose to enable them.</p><p id="nexusWaHelp" role="status">Click below to begin linking. You will scan a QR code using WhatsApp → Linked Devices → Link a Device.</p><button type="button" id="nexusWaLinkButton" class="price-cta" style="border:0;cursor:pointer">Link Your WhatsApp</button><div id="nexusWaEmbedded" hidden style="margin-top:18px"><iframe title="Nexus WhatsApp local linking" src="about:blank" loading="lazy" referrerpolicy="no-referrer" style="width:100%;min-height:660px;border:1px solid #c8ded1;border-radius:16px;background:#0c1714"></iframe><p class="fine">Local prototype. WA-AKG must be running on port 3790 and Nexus WhatsApp bridge on port 8791. No deployment or customer account is connected yet.</p></div></div>';
}
function renderOverview(){
 const s=workspace.store,items=workspace.offerings||[],leads=workspace.leads||[];
 let html='<div class="view-grid"><div class="card"><div class="meta">Published storefront</div><strong class="metric">'+(s?.published?'Live':'Not live')+'</strong><p>'+(s?.published?'Your SmartLink is available to customers.':'Complete setup to publish your business.')+'</p></div><div class="card"><div class="meta">Offerings</div><strong class="metric">'+items.length+'</strong><p>Products, services and consultations</p></div><div class="card"><div class="meta">Customer inquiries</div><strong class="metric">'+leads.length+'</strong><p>Leads linked to this business</p></div></div>';
 if(workspace.access.reason==="COMPLIMENTARY")html+='<div class="alert success">Your business has lifetime complimentary access. No trial countdown or subscription payment is required.</div>';
 if(!workspace.aiConfigured)html+='<div class="alert">Live AI is not yet connected to NexusSales. Your trial will NOT start, and your public store cannot be published until the hosted AI service is configured.</div>';
 else if(!s?.published)html+='<div class="alert success">Your AI service is available. Save your store and offerings, then publish to start the 48-hour trial.</div>';
 if(workspace.access.reason==="TRIAL_EXPIRED")html+='<div class="alert">Your 48-hour trial has ended. A verified PayPal subscription is required to resume your store and AI assistant.</div>';
 html+='<div class="card"><h2>Get ready to sell</h2><p>Tell the assistant what you offer, include real prices and hours, then publish a permanent SmartLink. Customers can ask questions without creating an account.</p><div class="actions"><button class="primary" data-jump="store">Configure business</button><button class="button" data-jump="offerings">Add products or services</button><button class="button" data-jump="testbot">✦ Test My AI</button><button class="button" data-jump="links">View SmartLink</button></div></div>';
 return html;
}
const personalityOptions=[
 {id:"professional",icon:"◈",title:"Professional Consultant",desc:"Confident, accurate and consultative. Great for most businesses.",best:"Recommended default"},
 {id:"friendly",icon:"♡",title:"Friendly Guide",desc:"Warm, patient and easy to understand. Great for retail and family services.",best:"Approachable"},
 {id:"sales",icon:"↗",title:"Sales Specialist",desc:"Discovers needs, explains benefits and offers a helpful next step.",best:"Lead conversion"},
 {id:"concierge",icon:"✧",title:"Premium Concierge",desc:"Attentive, polished and discreet. Great for luxury and premium services.",best:"White-glove service"},
 {id:"concise",icon:"≡",title:"Fast & Direct",desc:"Short, clear answers with minimal small talk.",best:"Quick responses"}
];
function personalityCards(selected){
 return '<fieldset class="wide personality-fieldset"><legend>AI personality <span class="hint">Choose how your assistant communicates</span></legend>'+
 '<div class="personality-grid">'+personalityOptions.map(p=>'<label class="personality-card"><input type="radio" name="storePersonality" value="'+p.id+'" '+(selected===p.id?'checked':'')+'><span class="personality-card-body"><span class="personality-icon">'+p.icon+'</span><strong>'+p.title+'</strong><small>'+p.desc+'</small><em>'+p.best+'</em></span></label>').join('')+'</div>'+
 '<p class="hint">All personalities use your saved business facts. They never invent prices, discounts, guarantees or confirmed appointments. Save, then test the tone under Test My AI.</p></fieldset>';
}
function renderStore(){
 const s=workspace.store||{},p=workspace.profile||{};
 return '<div class="card"><form id="storeForm" class="detail-form">'+
 '<label>Business name<input id="storeName" maxlength="150" required value="'+htmlEsc(s.name||p.business_name||"")+'"></label>'+
 '<label>SmartLink name (editable)<input id="storeSlug" maxlength="48" required pattern="[a-z0-9]+(-[a-z0-9]+)*" title="Use lowercase letters, numbers and single hyphens" value="'+htmlEsc(s.slug||"")+'" placeholder="your-business"></label>'+
 '<label>Industry<input id="storeIndustry" maxlength="100" value="'+htmlEsc(s.industry||"")+'" placeholder="Marketing, plumbing, HVAC, retail, etc."></label>'+
 '<label>AI assistant name<input id="storeAgent" maxlength="70" value="'+htmlEsc(s.agent_name||"Business Assistant")+'"></label>'+
 personalityCards(s.ai_personality||"professional")+
 '<label class="wide">Store headline<input id="storeHeadline" maxlength="180" value="'+htmlEsc(s.headline||"")+'" placeholder="Expert services for your next project"></label>'+
 '<label class="wide">Business description and policies<textarea id="storeDescription" rows="5" maxlength="2500">'+htmlEsc(s.description||"")+'</textarea></label>'+
 '<label>Business hours<input id="storeHours" maxlength="280" value="'+htmlEsc(s.hours||"")+'" placeholder="Mon–Fri 8AM–5PM"></label>'+
 '<label>Store cover image URL (HTTPS)<input id="storeImage" type="url" value="'+htmlEsc(s.store_image_url||"")+'" placeholder="https://..."></label>'+
 '<div class="wide actions"><button class="primary" type="submit" '+(!isEditable()?'disabled':'')+'>Save business details</button><p id="storeSaveStatus" role="status" aria-live="polite"></p></div></form>'+
 '<p class="hint">Image URLs are saved in the database; the original image stays with its image host. Changes are reflected on the public store after publication.</p></div>';
}
function renderOfferings(){
 const list=workspace.offerings||[];
 const cards=list.map(p=>'<article class="offering">'+(p.image_url?'<img alt="" src="'+htmlEsc(p.image_url)+'">':'<div class="placeholder">✦</div>')+
 '<div class="inside"><h3>'+productName(p)+'</h3><small>'+htmlEsc(p.type)+' • '+htmlEsc(p.status)+'</small><strong>'+htmlEsc(p.price_label||"Ask for a quote")+'</strong><p>'+htmlEsc(p.description||"")+'</p><div class="actions"><button class="button" data-edit="'+htmlEsc(p.id)+'">Edit</button><button class="button danger" data-delete="'+htmlEsc(p.id)+'">Delete</button></div></div></article>').join("");
 return '<div class="actions"><button class="primary" id="addOffering" '+(!isEditable()?'disabled':'')+'>+ Add product or service</button></div>'+
 (list.length?'<div class="offer-grid">'+cards+'</div>':'<div class="empty">No offerings yet. Add your first product, service, package, or consultation.</div>')+
 '<p class="hint">Only publish accurate prices, services, and availability. The AI is instructed not to invent missing details.</p>';
}
function smartUrl(){return workspace?.store?.slug?location.origin+"/s/"+workspace.store.slug:""}

function renderTestBot(){
 const st=workspace?.store,items=workspace?.offerings||[];
 const ready=Boolean(st&&isEditable());
 const sellingNexus=items.some(p=>String(p.name||"").trim().toLowerCase()==="nexus ai");
 const intro=st?(sellingNexus?"Hi! I am "+(st.agent_name||"your business assistant")+". Would you like an AI for your business, a personal assistant, or would you like me to tell you more about it? Explore the platform: https://za-p-za-p.vercel.app/":"Hi! I am "+(st.agent_name||"your business assistant")+". Ask me about "+st.name+"'s products and services."):"Save your business profile first to begin.";
 const style=personalityOptions.find(p=>p.id===(st?.ai_personality||"professional"))||personalityOptions[0];
 return '<div class="testbot-wrap"><div class="testbot-setup card"><span class="tag">PRIVATE PREVIEW • ONLY YOU</span><h2>Your own AI. Your real business information.</h2><p>This is a private testing space. Your assistant uses the products, prices, description and hours you saved. Test it before publishing.</p>'+
 '<div class="testbot-status">'+(st?'✓ Business saved':'○ Save business details')+'</div>'+
 '<div class="testbot-status">'+(items.length?'✓ '+items.length+' product(s) or service(s) loaded':'○ No offerings yet — you can still test your saved business description')+'</div>'+
 '<div class="testbot-status">✓ Testing never publishes the store or starts your 48-hour trial.</div>'+ 
 '<div class="testbot-status">✦ Personality: <strong>'+htmlEsc(style.title)+'</strong> — '+htmlEsc(style.desc)+'</div>'+
 '<p class="testbot-help">20 private test questions per day. Replies use your configured AI provider, never example responses.</p>'+
 '<div class="actions"><button type="button" class="button" data-jump="store">Business details</button><button type="button" class="button" data-jump="offerings">Edit offerings</button><button type="button" class="button" data-jump="links">Publish when ready</button></div></div>'+
 '<div class="testbot-chat card"><div class="testbot-chat-head"><div class="testbot-ai-icon">✦</div><div><strong>'+htmlEsc(st?.agent_name||"My AI Assistant")+'</strong><small>'+htmlEsc(st?.name||"Your business")+' • PRIVATE TEST CHAT</small></div></div>'+
 '<div class="testbot-messages" id="testBotMessages" role="log" aria-live="polite"><div class="testbot-bubble assistant">'+htmlEsc(intro)+'</div></div>'+
 '<div class="testbot-controls"><div class="testbot-hints">Try: “What do you offer?” · “How much does it cost?” · “When are you open?”</div>'+
 '<form id="testBotForm" class="testbot-form"><label class="sr-only" for="testBotQuestion">Ask your own AI a question</label><textarea id="testBotQuestion" rows="2" maxlength="500" autocomplete="off" placeholder="'+(ready?"Ask about your products or services…":"Save your business details first")+'" '+(!ready?'disabled':'')+' required></textarea><button type="submit" class="primary" id="testBotSend" '+(!ready?'disabled':'')+'>Send ↗</button></form><p id="testBotStatus" role="status" class="testbot-meta">'+(ready?"Ready to test your saved catalog. Your trial remains untouched.":"Save your business details to enable testing. Product prices cannot be provided until you add offerings.")+'</p></div></div></div>';
}
let testBotHistory=[];
function testBotMessage(role,content){
 const log=$("testBotMessages");if(!log)return;
 const node=document.createElement("div");node.className="testbot-bubble "+role;node.textContent=content;log.appendChild(node);log.scrollTop=log.scrollHeight;return node;
}
async function submitTestBot(event,retry=true){
 event.preventDefault();
 const field=$("testBotQuestion"),button=$("testBotSend");
 if(!field||!button||button.disabled)return;
 const message=field.value.trim();if(!message||message.length>500)return;
 const header=await authHeader();if(!header){toast("Please sign in again");return}
 button.disabled=true;field.disabled=true;
 testBotMessage("user",message);field.value="";
 const pending=testBotMessage("assistant","Nexus AI is thinking…");
 text("testBotStatus","Connecting securely to your AI…");
 try{
  const r=await fetch("/.netlify/functions/owner-test-chat",{method:"POST",headers:header,body:JSON.stringify({message,history:testBotHistory.slice(-6)}),cache:"no-store",signal:AbortSignal.timeout(27000)});
  const data=await r.json().catch(()=>({}));
  if(r.status===401&&retry&&await refreshAuth()){
   const newHeader=await authHeader();
   if(!newHeader)throw Error("Your session expired. Please sign in again.");
   const again=await fetch("/.netlify/functions/owner-test-chat",{method:"POST",headers:newHeader,body:JSON.stringify({message,history:testBotHistory.slice(-6)}),cache:"no-store",signal:AbortSignal.timeout(27000)});
   const againData=await again.json().catch(()=>({}));
   if(!again.ok)throw Error((againData.error||"AI testing failed")+(againData.code?" ["+againData.code+"]":""));
   if(!againData.reply||!["ollama","ollama-lite","openai"].includes(againData.source))throw Error("AI did not return a verified response");
   pending.textContent=againData.reply;
   testBotHistory.push({role:"user",content:message},{role:"assistant",content:againData.reply});
  }else{
   if(!r.ok)throw Error((data.error||"AI testing failed")+(data.code?" ["+data.code+"]":""));
   if(!data.reply||!["ollama","ollama-lite","openai"].includes(data.source))throw Error("AI did not return a verified response");
   pending.textContent=data.reply;
   testBotHistory.push({role:"user",content:message},{role:"assistant",content:data.reply});
  }
  testBotHistory=testBotHistory.slice(-6);
  text("testBotStatus",workspace?.access?.reason==="COMPLIMENTARY"?"AI answered your question. Your complimentary access stays active.":"AI answered your question. Your 48-hour trial has not started.");
 }catch(error){
  pending.textContent=error?.name==="TimeoutError"?"Your AI did not answer in time. Try again.":error.message;
  text("testBotStatus","No fake answers were used. Your trial remains unchanged.");
 }finally{button.disabled=false;field.disabled=false;field.focus()}
}

function renderLinks(){
 const s=workspace.store,url=smartUrl();
 if(!s)return'<div class="empty">Save your business first to reserve a SmartLink.</div>';
 let body='<div class="card"><h2>Your permanent SmartLink</h2><p>Put this on your Instagram bio, flyers, emails and text messages. Customers can browse offerings and chat with your AI assistant.</p>'+
 '<div class="link-input"><input id="storeLink" readonly value="'+htmlEsc(url)+'"><button class="button" id="copyLink">Copy</button></div>';
 if(!s.published)body+='<div class="alert">This link is reserved but not public yet. Publishing requires an active hosted AI service and at least one offering.</div>';
 else body+='<div class="alert success">Your store is published and accepting customer conversations.</div>';
 body+='<div class="link-actions"><a class="button" href="'+htmlEsc(url)+'" target="_blank" rel="noopener">Open store</a>'+
 '<a class="button" href="sms:?body='+encodeURIComponent("Explore "+s.name+": "+url)+'">Share by text</a>'+
 '<a class="button" href="mailto:?subject='+encodeURIComponent("Explore "+s.name)+'&body='+encodeURIComponent("You can ask our AI assistant about our offerings here: "+url)+'">Share by email</a></div>'+
 '<img class="qr" alt="Store SmartLink QR code" loading="lazy" src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&amp;data='+encodeURIComponent(url)+'">'+
 '<div class="actions"><button id="publishStore" class="primary" '+(!workspace.aiConfigured||!isEditable()||!(workspace.offerings||[]).length||s.published?'disabled':'')+'>'+(workspace.access.reason==="COMPLIMENTARY"?"Publish store — free forever":"Publish store & start trial")+'</button>'+
 (s.published?'<button id="pauseStore" class="button">Unpublish store</button>':'')+'</div></div>'+
 '<div class="card"><h2>Website widget • +$79/month</h2><p>Embed your AI salesperson on an existing website. The 48-hour trial includes widget access; the new business checkout must be verified before charges can begin.</p>'+(
 workspace.bot?.enabled?'<label>Install script (add before the closing body tag)<textarea id="widgetCode" rows="3" readonly>'+htmlEsc('<script src="'+location.origin+'/widget.js" data-bot-id="'+workspace.bot.bot_id+'" async></'+'script>')+'</textarea></label><div class="actions"><button class="button" id="copyWidgetCode">Copy widget code</button><button class="button danger" id="disableWidget">Disable widget</button></div>':
 '<div class="actions"><button class="button" id="enableWidget" '+(!workspace.widgetAllowed||!s.published?'disabled':'')+'>Generate my website widget</button></div>'
 )+(!workspace.widgetAllowed?'<p class="hint">The website widget requires an active bundled subscription after the trial.</p>':'')+'</div>';
 return body+renderQrSources()+renderChatSettings();
}
function renderPersonalAssistant(){
 const a=workspace?.personalAssistant||{},saved=Boolean(a.id),special=workspace?.personalAssistantSpecial===true;
 if(!workspace?.store)return '<div class="card"><div class="tag">PERSONAL AI</div><h2>Set up your private assistant workspace</h2><p>No business, storefront or phone number required. Enter the name visitors should associate with your assistant.</p><form id="personalWorkspaceForm"><label>Your name<input id="personalDisplayName" required minlength="2" maxlength="50" placeholder="Your name"></label><div class="actions"><button type="submit" class="primary">Continue to my assistant</button></div><p id="personalWorkspaceError" role="status"></p></form></div>';
 const name=a.display_name||(special?'Hope':'Alex');
 const style=a.personality||(special?'faithful_encourager':'friendly');
 const handle=a.handle||(special?'junior-ai':'my-assistant');
 const url=saved?location.origin+'/assistant/'+encodeURIComponent(handle):'';
 const canShare=workspace?.access?.allowed===true&&a.enabled===true;
 const canStartPersonalTrial=saved&&workspace?.access?.reason==="NOT_STARTED"&&a.enabled===true;
 const personalities=[...personalityOptions,...(special?[
 {id:'faithful_encourager',icon:'✝',title:'Faithful Encourager',desc:'Christian-inspired kindness and encouragement, only when welcomed.',best:'Exclusive bonus'},
 {id:'nexus_sales_expert',icon:'✦',title:'NexusSales AI Sales Expert',desc:'Sells NexusSales with ready-to-use product features, accurate pricing and opt-in lead capture.',best:'Exclusive · preloaded'}
]:[])];
 return '<div class="card personal-builder"><div class="tag">BUILD YOUR PERSONAL ASSISTANT</div><h2>Your AI, your name, your personality</h2>'+
 '<p>Build an assistant on NexusSales. Send a personal link by WhatsApp or anywhere else. Visitors open a mobile-first page and may choose to leave a contact request.</p>'+
 (workspace.personalAssistantSchemaReady===false?'<div class="setup-alert">The personal assistant database migration has not been applied. This builder is in review mode and saving is disabled.</div>':'')+
 '<form id="personalBuilderForm" class="personal-builder-form"><div class="personal-two">'+
 '<label>Assistant name<input id="paName" required minlength="2" maxlength="50" value="'+htmlEsc(name)+'" placeholder="Hope, Maya, Oliver"></label>'+
 '<label>Personal link ID (editable)<input id="paHandle" required minlength="3" maxlength="32" pattern="[a-z][a-z0-9-]{2,31}" title="Start with a letter; use lowercase letters, numbers or single hyphens" value="'+htmlEsc(handle)+'"></label></div>'+
 '<fieldset class="personality-fieldset"><legend>Choose a personality</legend><div class="personality-grid">'+
 personalities.map(p=>'<label class="personality-card"><input type="radio" name="paStyle" value="'+p.id+'" '+(style===p.id?'checked':'')+'><span class="personality-card-body"><span class="personality-icon">'+p.icon+'</span><strong>'+htmlEsc(p.title)+'</strong><small>'+htmlEsc(p.desc)+'</small><em>'+htmlEsc(p.best)+'</em></span></label>').join('')+'</div></fieldset>'+
 '<label>Welcome message<textarea id="paGreeting" rows="3" maxlength="400" placeholder="Hi! I am an AI assistant. How can I help you?">'+htmlEsc(a.greeting||'')+'</textarea></label>'+
 '<label>Public information the assistant may share<textarea id="paAbout" rows="3" maxlength="900" placeholder="Share public background only, never private information or passwords">'+htmlEsc(a.about||'')+'</textarea></label>'+
 '<div class="personal-two"><label>Messages per session (5–30)<input id="paMessages" type="number" min="5" max="30" required value="'+Number(a.max_messages||10)+'"></label>'+
 '<label>Session minutes (5–30)<input id="paMinutes" type="number" min="5" max="30" required value="'+Number(a.max_minutes||10)+'"></label></div>'+
 '<label>Public owner phone (+country code)<input id="paOwnerPhone" type="tel" maxlength="16" placeholder="+15551234567" value="'+htmlEsc(a.public_contact_phone||'')+'"></label>'+
 '<label class="personal-check"><input type="checkbox" id="paPublishPhone" '+(a.publish_contact_phone===true?'checked':'')+'> Share my phone for direct handoff after the chat limit</label>'+
 '<label class="personal-check"><input type="checkbox" id="paEnabled" '+(a.enabled===true||!saved?'checked':'')+'> Enable assistant for visitors</label>'+
 '<button class="primary" type="submit" id="paSave" '+(workspace.personalAssistantSchemaReady===false?'disabled':'')+'>'+(saved?'Save assistant':'Create assistant')+'</button></form>'+
 '<div class="personal-live-preview"><strong id="paPreviewName">'+htmlEsc(name)+'</strong><p id="paPreviewGreeting">'+htmlEsc(a.greeting||('Hi! I am '+name+', your AI assistant.'))+'</p><small>Profile preview; live replies require your Ollama connection.</small></div>'+
 (saved?'<div class="personal-share"><h3>Personal AI web link</h3><div class="link-input"><input id="personalLink" readonly value="'+htmlEsc(url)+'">'+(canShare?'<button id="copyPersonalLink" class="button" type="button">Copy</button>':'')+'</div>'+(canShare?'<div class="link-actions"><a class="button" href="'+htmlEsc(url)+'" target="_blank" rel="noopener">Open assistant</a><a class="button" href="https://wa.me/?text='+encodeURIComponent('Meet '+name+', my AI assistant: '+url)+'" target="_blank" rel="noopener">Share by WhatsApp link</a></div>':'<p class="hint">This address is reserved but not publicly active. Activate your trial with a working hosted AI, or complete a verified paid subscription, before sharing it.</p>')+(canStartPersonalTrial?'<div class="actions"><button type="button" class="primary" id="activatePersonalTrial">Activate my 48-hour AI trial</button><p id="personalTrialStatus" role="status"></p></div>':'')+'</div>':'')+
 '<p class="hint">Faithful Encourager is exclusive to your lifetime complimentary account. The assistant always identifies itself as AI. Opt-in leads appear in your existing Leads & Chats dashboard.</p></div>';
}
// Super-admin preview only. Pricing is not wired to PayPal or subscriptions.
function renderMarketPlans(){
 if(workspace?.personalAssistantSpecial!==true)return '<div class="card">Super Admin only.</div>';
 return '<div class="card"><div class="tag">SUPER ADMIN · DRAFT PRICING</div><h2>Worldwide Plans · Brazil</h2>'+
 '<p>This is your private pricing design. No billing, subscriptions or team accounts are activated.</p>'+
 '<label for="marketCountry">Region</label><select id="marketCountry"><option value="BR">Brazil · Português (BR)</option><option value="GLOBAL">United States & other countries</option></select>'+
 '<label for="marketEmployees">Team size (3 included)</label><input id="marketEmployees" type="number" min="0" max="1000" value="3">'+
 '<div class="view-grid"><div class="card"><small>Business base</small><h2>US$ 499/month</h2><p>Includes first 3 employees, each with a separate QR code and WhatsApp contact (planned).</p></div>'+
 '<div class="card"><small>Additional employee</small><h2 id="marketExtraPrice">US$ 30/month</h2><p id="marketCountryLabel">Brazil · $30, outside Brazil · $50</p></div>'+
 '<div class="card"><small>Proposed business total</small><h2 id="marketTotal">US$ 499/month</h2><p id="marketBreakdown">3 included; 0 additional.</p></div></div>'+
 '<div class="view-grid"><div class="card"><h3>Personal assistant</h3><strong>US$ 30/month</strong><p>Individual plan; business employment not required.</p></div>'+
 '<div class="card"><h3>Just for Fun</h3><strong>US$ 15/month</strong><p>Five personalities. Personal use, no business required.</p></div></div>'+
 '<label><input type="checkbox" id="marketWidget"> Add website chatbot (+$79/month)</label><p class="hint">Product roadmap: employer invites employees, each employee selects language and WhatsApp, has an individual QR code, and leads belong to the company but are assigned to the employee. These controls and payments are not live yet.</p></div>';
}
function updateMarketPreview(){
 const c=$("marketCountry"),e=$("marketEmployees");if(!c||!e)return;
 const count=Math.max(0,Math.min(1000,Math.floor(Number(e.value)||0)));
 const extra=Math.max(0,count-3),per=c.value==='BR'?30:50,widget=Boolean($("marketWidget")?.checked),total=499+extra*per+(widget?79:0);
 $("marketExtraPrice").textContent="US$ "+per+"/month";
 $("marketCountryLabel").textContent="Brazil · $30, outside Brazil · $50";
 $("marketTotal").textContent="US$ "+total.toLocaleString("en-US")+"/month";
 $("marketBreakdown").textContent="3 included; "+extra+" additional; website widget "+(widget?"+$79":"not selected")+".";
}

function renderTeam(){
 if(workspace.teamAllowed!==true)return '<div class="card"><h2>Equipe de vendas</h2><p>O plano Empresarial começa em US$ 499/mês, incluindo 3 funcionários. Este recurso ainda não faz parte do seu plano atual. A cobrança de novas assinaturas não está ativada.</p></div>';
 const people=workspace.employees||[],sources=workspace.qrSources||[];
 const cards=people.map(p=>{
  const qr=sources.find(s=>s.id===p.qr_source_id);
  const url=qr?qrSourceUrl(qr.code):"";
  const img=url?"https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encodeURIComponent(url):"";
  const number=String(p.whatsapp||"").replace(/\D/g,"");
  const count=(workspace.leads||[]).filter(l=>l.employee_id===p.id).length;
  return '<div class="card"><h3>'+htmlEsc(p.name)+'</h3><p>'+htmlEsc(p.role)+' • '+htmlEsc(p.language)+' • '+(p.enabled?'Ativo':'Pausado')+'</p>'+
   (img?'<img class="qr" alt="QR Code do funcionário" src="'+htmlEsc(img)+'" loading="lazy">':'')+
   '<p>'+count+' leads atribuídos</p><div class="actions">'+
   (url?'<a class="button" target="_blank" rel="noopener" href="'+htmlEsc(url)+'">Abrir QR</a>':'')+
   '<a class="button" target="_blank" rel="noopener" href="https://wa.me/'+htmlEsc(number)+'">WhatsApp</a>'+
   '<button class="button" type="button" data-edit-team="'+htmlEsc(p.id)+'">Editar</button>'+
   '<button class="button" type="button" data-toggle-team="'+htmlEsc(p.id)+'">'+(p.enabled?'Pausar':'Ativar')+'</button>'+
   '<button class="button" type="button" data-delete-team="'+htmlEsc(p.id)+'">Excluir</button></div></div>';
 }).join('');
 return '<div class="card"><h2>Equipe de vendas</h2><p>Três funcionários incluídos; cada um tem seu próprio QR Code e WhatsApp. Leads e histórico continuam pertencendo à loja.</p>'+
 '<p><strong>'+people.length+'</strong> funcionários cadastrados · '+(workspace.personalAssistantSpecial?'20 disponíveis para testes administrativos':'3 incluídos; extras aguardam faturamento PayPal')+'</p>'+
 '<form id="teamForm"><input type="hidden" id="teamId">'+
 '<label>Nome do funcionário<input id="teamName" maxlength="80" placeholder="Ana" required></label>'+
 '<label>Cargo<input id="teamRole" maxlength="80" value="Vendedor" required></label>'+
 '<label>WhatsApp com DDI (somente números)<input id="teamPhone" maxlength="16" placeholder="5511999999999" required></label>'+
 '<label>Idioma<select id="teamLanguage"><option value="pt_BR">Português (Brasil)</option><option value="en_US">English</option><option value="es_ES">Español</option></select></label>'+
 '<div class="actions"><button class="primary" id="teamSubmit" type="submit">Salvar funcionário</button><button class="button" id="teamClear" type="button">Limpar</button></div></form><p id="teamStatus" role="status"></p></div>'+
 '<div class="view-grid">'+(cards||'<div class="card">Nenhum funcionário cadastrado.</div>')+'</div>';
}
function bindTeam(){
 const clear=()=>{$("teamForm").reset();$("teamId").value="";$("teamRole").value="Vendedor"};
 $("teamClear").onclick=clear;
 $("teamForm").onsubmit=async event=>{
  event.preventDefault();const button=$("teamSubmit");button.disabled=true;
  try{
   await ownerApi("save_employee",{employee:{id:$("teamId").value||null,name:$("teamName").value.trim(),role:$("teamRole").value.trim(),whatsapp:$("teamPhone").value.trim(),language:$("teamLanguage").value}});
   await loadWorkspace();viewName="team";render();toast("Funcionário salvo");
  }catch(e){$("teamStatus").textContent=e.message}finally{if(button.isConnected)button.disabled=false}
 };
 document.querySelectorAll("[data-edit-team]").forEach(button=>button.onclick=()=>{
  const p=(workspace.employees||[]).find(x=>x.id===button.dataset.editTeam);if(!p)return;
  $("teamId").value=p.id;$("teamName").value=p.name;$("teamRole").value=p.role;
  $("teamPhone").value=p.whatsapp;$("teamLanguage").value=p.language;$("teamName").focus();
 });
 document.querySelectorAll("[data-toggle-team]").forEach(button=>button.onclick=async()=>{
  const p=(workspace.employees||[]).find(x=>x.id===button.dataset.toggleTeam);if(!p)return;
  try{await ownerApi("set_employee_enabled",{id:p.id,enabled:!p.enabled});await loadWorkspace();viewName="team";render()}catch(e){toast(e.message)}
 });
 document.querySelectorAll("[data-delete-team]").forEach(button=>button.onclick=async()=>{
  const p=(workspace.employees||[]).find(x=>x.id===button.dataset.deleteTeam);if(!p||!confirm("Arquivar "+p.name+"? O QR será desativado e o histórico será preservado."))return;
  try{await ownerApi("delete_employee",{id:p.id});await loadWorkspace();viewName="team";render()}catch(e){toast(e.message)}
 });
}
function renderErrorLogs(){
 if(workspace?.personalAssistantSpecial!==true)return '<div class="card">Logs are restricted to the complimentary owner.</div>';
 return '<div class="card"><h2>AI Error Logs</h2><p>Only technical status is saved. No visitor messages, tokens, passwords, or IP addresses are recorded here.</p>'+
 '<div class="actions"><button class="button" id="refreshAiLogs" type="button">Refresh Logs</button></div>'+
 '<div id="aiLogsResults" role="status">Loading recent errors…</div></div>';
}
async function fetchAiLogs(){
 const target=$("aiLogsResults");if(!target)return;
 target.textContent="Loading recent errors…";
 try{
  const result=await ownerApi("ai_error_logs",{});
  const rows=result.logs||[];
  target.innerHTML=rows.length?'<div class="lead-list">'+rows.map(x=>
   '<div class="lead-row" style="display:block;text-align:left;cursor:auto"><strong>'+htmlEsc(x.error_code)+'</strong>'+
   '<small style="display:block">'+htmlEsc(new Date(x.created_at).toLocaleString())+' • Stage: '+htmlEsc(x.stage)+' • '+Number(x.elapsed_ms)+' ms</small>'+
   '<small style="display:block">Reference: '+htmlEsc(x.id)+'</small></div>').join('')+'</div>'
   :'<p>No AI failures logged yet. Send a test message, then refresh.</p>';
 }catch(e){target.textContent="Unable to load diagnostic logs: "+e.message}
}
function renderLeads(){
 const leads=workspace.leads||[],sources=workspace.qrSources||[];
 const newCount=leads.filter(l=>l.status==="New").length;
 const appointments=leads.filter(l=>l.request_type==="appointment").length;
 const qrLeads=leads.filter(l=>l.source_id).length;
 const metric=(label,num,caption)=>'<div class="lead-metric"><small>'+label+'</small><strong>'+num+'</strong><span>'+caption+'</span></div>';
 return '<div class="lead-metrics">'+metric('Total leads',leads.length,'People to follow up')+
 metric('New inquiries',newCount,'Awaiting response')+metric('Appointment requests',appointments,'Require confirmation')+
 metric('QR-sourced leads',qrLeads,'Attributed to printed codes')+'</div>'+'<div class="nx-lead-tabs" role="tablist" aria-label="Leads & Chats views"><button type="button" role="tab" data-lead-pane="leads">Leads &amp; Chats</button><button type="button" role="tab" data-lead-pane="calendar">📅 Calendar / Agenda</button><button type="button" role="tab" id="nxHistoryTab" aria-selected="false">Chat history</button></div><div id="leadListPane">'+
 '<div class="card lead-center"><div class="lead-bar"><div><h2>Lead Center</h2><p>Every customer request, follow-up and linked AI transcript in one place.</p></div>'+
 '<select id="leadFilter" aria-label="Filter leads"><option value="all">All leads</option><option value="New">New</option><option value="Contacted">Contacted</option><option value="Appointment Requested">Appointment requested</option><option value="Booked">Booked</option><option value="Won">Won</option><option value="Lost">Lost</option></select></div>'+
 (leads.length?'<div class="lead-list">'+leads.map(l=>{
 const source=sources.find(s=>s.id===l.source_id);
 const date=new Date(l.created_at).toLocaleString();
 return '<button class="lead-row" type="button" data-lead="'+htmlEsc(l.id)+'" data-status="'+htmlEsc(l.status)+'">'+
 '<span class="lead-avatar">'+htmlEsc((l.customer_name||'?').slice(0,1).toUpperCase())+'</span><span class="lead-main"><strong>'+htmlEsc(l.customer_name)+'</strong><small>'+htmlEsc(l.interest.slice(0,100))+'</small><small>'+htmlEsc(l.personal_assistant_id?('Personal AI • '+(workspace.personalAssistant?.display_name||'Assistant')):(source?.label||'SmartStore / website'))+' • '+htmlEsc((workspace.employees||[]).find(e=>e.id===l.employee_id)?.name||'')+' • '+htmlEsc(date)+'</small></span>'+
 '<span class="lead-right"><span class="lead-status">'+htmlEsc(l.status)+'</span><small>'+htmlEsc(l.customer_phone||l.customer_email||'No contact')+'</small></span></button>'
 }).join('')+'</div>':'<div class="empty">No leads yet. Publish a QR code and ask a customer to submit an inquiry.</div>')+
 '</div><div class="card lead-detail hidden" id="leadDetail" aria-live="polite"></div></div><div id="leadCalendarPane" class="hidden"></div><div id="nxHistoryPane" class="hidden"></div>';
}
function qrSourceUrl(code){return smartUrl()+'?src='+encodeURIComponent(code)}
function renderQrSources(){
 const sources=workspace.qrSources||[];
 return '<div class="card"><h2>Tracked QR codes</h2><p>Create one QR for each storefront window, vehicle, reception desk or product. Each lead is attributed to its QR.</p>'+
 '<form id="qrForm" class="qr-create"><input id="qrLabel" placeholder="e.g. Front door, Ford F-150, Reception" maxlength="80" required minlength="2">'+
 '<select id="qrOffering"><option value="">General business</option>'+(workspace.offerings||[]).map(p=>'<option value="'+htmlEsc(p.id)+'">'+htmlEsc(p.name)+'</option>').join('')+'</select>'+
 '<button class="primary" type="submit" '+(!workspace.store?.published?'disabled':'')+'>Create QR</button></form>'+
 (!workspace.store?.published?'<p class="hint">Publish your SmartStore to generate tracked QR codes.</p>':'')+
 '<div class="qr-list">'+sources.map(s=>{
 const url=qrSourceUrl(s.code),qr='https://api.qrserver.com/v1/create-qr-code/?size=250x250&data='+encodeURIComponent(url);
 const count=(workspace.leads||[]).filter(l=>l.source_id===s.id).length,scans=Number(s.scan_count||0);
 return '<div class="qr-item"><img src="'+htmlEsc(qr)+'" alt="QR code for '+htmlEsc(s.label)+'" loading="lazy"><div><strong>'+htmlEsc(s.label)+'</strong><small>'+count+' lead(s) • '+(s.enabled?'Active':'Disabled')+'</small><a href="'+htmlEsc(url)+'" target="_blank" rel="noopener">Open QR link</a><div class="actions"><button type="button" class="button" data-copy-qr="'+htmlEsc(s.code)+'">Copy URL</button><button type="button" class="button" data-print-qr="'+htmlEsc(s.id)+'">Print sign</button><button type="button" class="button" data-toggle-qr="'+htmlEsc(s.id)+'">'+(s.enabled?'Disable':'Enable')+'</button></div></div></div>'
 }).join('')+'</div></div>';
}
function renderChatSettings(){
 const s=workspace.store||{};
 return '<div class="card"><h2>Customer conversation settings</h2><p>Visitors can chat for a limited number of messages and minutes, then request a callback or appointment.</p>'+
 '<form id="chatSettingsForm" class="qr-create"><label>Visitor messages<input id="chatMaxMessages" type="number" min="5" max="30" required value="'+Number(s.chat_max_messages||10)+'"></label>'+
 '<label>Minutes per session<input id="chatMaxMinutes" type="number" min="5" max="30" required value="'+Number(s.chat_max_minutes||10)+'"></label>'+
 '<label class="lead-check"><input id="appointmentsEnabled" type="checkbox" '+(s.appointments_enabled!==false?'checked':'')+'> Allow appointment requests</label>'+
 '<button class="primary" type="submit">Save settings</button></form></div>';
}
function renderBilling(){
 const a=workspace.access||{},url="/account.html";
 const status=a.reason==="COMPLIMENTARY"?"Lifetime complimentary account — no payment required.":a.reason==="PAID"?"Existing subscription active.":"Business subscriptions are being configured; live checkout is not enabled.";
 return '<div class="card"><h2>'+htmlEsc(statusText())+'</h2><p>'+htmlEsc(status)+'</p><div class="view-grid"><div><strong class="metric">$499<small>/mo</small></strong><p>Business base with 3 employees. Extra employees: $30 each/month in Brazil or $50 elsewhere.</p></div><div><strong class="metric">+$79<small>/mo</small></strong><p>Optional website chatbot. Prices are estimates until checkout is verified.</p></div></div><p class="hint">The old $149/$228 PayPal plans are retired for new purchases.</p><div class="actions">'+(a.reason==="COMPLIMENTARY"?'<span class="status-badge">✓ No payment required</span>':'<a class="primary" href="'+url+'">Account status</a>')+'</div></div>';
}
function bindView(){
 if(viewName==="whatsappLink"){
  const button=$("nexusWaLinkButton");
  if(button)button.onclick=()=>{
   if(!["localhost","127.0.0.1"].includes(location.hostname)||workspace?.whatsappLinkAllowed!==true)return;
   const wrapper=$("nexusWaEmbedded");
   wrapper.hidden=false;
   const frame=wrapper.querySelector("iframe");
   if(frame&&frame.getAttribute("src")==="about:blank")frame.setAttribute("src","http://127.0.0.1:8791/");
   button.textContent="WhatsApp linking opened";
   button.disabled=true;
   text("nexusWaHelp","Follow the one-click connection instructions below to display your WhatsApp QR code.");
  };
 }

 if(viewName==="team"&&workspace?.teamAllowed===true)bindTeam();
 if(viewName==="brazil"&&workspace?.personalAssistantSpecial===true){$("marketCountry").onchange=updateMarketPreview;$("marketEmployees").oninput=updateMarketPreview;$("marketWidget").onchange=updateMarketPreview;updateMarketPreview()}
 if(viewName==="logs"&&workspace?.personalAssistantSpecial===true){$("refreshAiLogs").onclick=fetchAiLogs;fetchAiLogs()}
 if(viewName==="personal"&&$("personalWorkspaceForm")){
  $("personalWorkspaceForm").onsubmit=async event=>{
   event.preventDefault();const button=event.target.querySelector('button[type="submit"]');
   button.disabled=true;
   try{
    const created=await ownerApi("initialize_personal_workspace",{displayName:$("personalDisplayName").value.trim()});
    if(!created.store?.id)throw Error("Personal workspace could not be verified.");
    await loadWorkspace({throwOnError:true});viewName="personal";render();toast("Personal workspace created. Set up your assistant.");
   }catch(error){const status=$("personalWorkspaceError");if(status)status.textContent=error.message;if(button.isConnected)button.disabled=false}
  };
 }
 if(viewName==="personal"&&$("personalBuilderForm")){
  const preview=()=>{$("paPreviewName").textContent=$("paName").value.trim()||"Your assistant";$("paPreviewGreeting").textContent=$("paGreeting").value.trim()||"Hi! I'm "+$("paName").value.trim()+", your AI assistant."};
  $("paName").oninput=preview;$("paGreeting").oninput=preview;
  document.querySelectorAll('input[name="paStyle"]').forEach(radio=>radio.addEventListener("change",()=>{
   if(radio.checked&&radio.value==="nexus_sales_expert"){
    $("paGreeting").value="Hi! I'm your NexusSales AI assistant. I can explain SmartStore, AI conversations, SmartLinks, QR codes, lead capture and pricing. What type of business do you run?";
    $("paAbout").value="NexusSales AI offers SmartStore pages for products and services, AI business conversations using real business details, SmartLinks and QR sharing, and opt-in customer inquiries. Business base: $499/month, including 3 employees; additional employees $30/month in Brazil or $50/month elsewhere; website widget +$79/month. A 48-hour trial begins only when the live store and hosted AI are activated.";
    preview();
    toast("NexusSales sales content loaded");
   }
  }));
  $("personalBuilderForm").onsubmit=async e=>{
   e.preventDefault();
   const button=$("paSave");
   const assistant={name:$("paName").value.trim(),handle:$("paHandle").value.trim().toLowerCase(),personality:document.querySelector('input[name="paStyle"]:checked')?.value,
    greeting:$("paGreeting").value.trim(),about:$("paAbout").value.trim(),maxMessages:Number($("paMessages").value),maxMinutes:Number($("paMinutes").value),contactPhone:$("paOwnerPhone").value.trim(),publishContactPhone:$("paPublishPhone").checked,enabled:$("paEnabled").checked};
   const previous=workspace.personalAssistant?.handle||"";
   if(previous&&previous!==assistant.handle){
    if(!confirm("Change your personal assistant link from /assistant/"+previous+" to /assistant/"+assistant.handle+"?\\n\\nYour old shared link will stop working. You must send the new link to your contacts."))return;
   }
   button.disabled=true;
   try{
    const saved=await ownerApi("save_personal_assistant",{assistant});
    if(saved.assistant?.handle!==assistant.handle)throw Error("Assistant link update could not be verified.");
    await loadWorkspace({throwOnError:true});
    if(workspace.personalAssistant?.handle!==assistant.handle)throw Error("Saved assistant link could not be verified. Refresh and try again.");
    viewName="personal";render();
    toast(previous&&previous!==assistant.handle?"Personal link changed. Share your new link.":"Personal assistant saved and verified.");
   }catch(error){toast(error.message);if(button.isConnected)button.disabled=false}
  };
  if($("activatePersonalTrial"))$("activatePersonalTrial").onclick=async()=>{
   const button=$("activatePersonalTrial"),status=$("personalTrialStatus");button.disabled=true;
   if(status)status.textContent="Checking hosted AI before starting your 48-hour trial…";
   try{
    const result=await ownerApi("activate_personal",{});
    if(result.activated!==true||result.access?.allowed!==true)throw Error("Activation could not be confirmed.");
    await loadWorkspace({throwOnError:true});viewName="personal";render();toast("Your 48-hour personal AI trial is active.");
   }catch(error){if(status?.isConnected)status.textContent=error.message;if(button.isConnected)button.disabled=false}
  };
  if($("copyPersonalLink"))$("copyPersonalLink").onclick=()=>navigator.clipboard.writeText($("personalLink").value).then(()=>toast("Link copied")).catch(()=>toast("Unable to copy"));
 }
 document.querySelectorAll("[data-jump]").forEach(e=>e.onclick=()=>{viewName=e.dataset.jump;render()});
 if(viewName==="leads"){
  const filter=$("leadFilter");
  filter.onchange=()=>document.querySelectorAll("[data-lead]").forEach(row=>{row.classList.toggle("hidden",filter.value!=="all"&&row.dataset.status!==filter.value)});
  document.querySelectorAll("[data-lead]").forEach(row=>row.onclick=async()=>{
   const lead=(workspace.leads||[]).find(l=>l.id===row.dataset.lead);if(!lead)return;
   const panel=$("leadDetail");panel.classList.remove("hidden");panel.textContent="Loading customer history…";
   try{
    const result=await ownerApi("lead_history",{id:lead.id});
    const sources=workspace.qrSources||[],src=sources.find(s=>s.id===lead.source_id);
    panel.innerHTML='<div class="lead-bar"><h2>'+htmlEsc(lead.customer_name)+'</h2><button type="button" id="closeLeadDetail" class="button">Close</button></div>'+
     '<div class="lead-detail-grid"><div><small>CONTACT</small><p>'+htmlEsc(lead.customer_email||"—")+'<br>'+htmlEsc(lead.customer_phone||"—")+'</p></div>'+
     '<div><small>REQUEST TYPE</small><p>'+htmlEsc(lead.request_type||"information")+'</p></div>'+
     '<div><small>QR SOURCE</small><p>'+htmlEsc(src?.label||"SmartStore / widget")+'</p></div>'+
     '<div><small>PREFERRED TIME</small><p>'+htmlEsc(lead.preferred_time||"Not supplied")+'</p></div></div>'+
     '<p><strong>Customer request</strong><br>'+htmlEsc(lead.interest)+'</p>'+
     '<label>Follow-up status <select id="leadStatusSelect">'+["New","Contacted","Appointment Requested","Booked","Won","Lost"].map(s=>'<option value="'+s+'" '+(s===lead.status?'selected':'')+'>'+s+'</option>').join("")+'</select></label>'+
     '<button type="button" class="primary" id="saveLeadStatus">Save status</button>'+
     '<h3>AI conversation history</h3><div class="lead-transcript">'+((result.messages||[]).length?result.messages.map(m=>'<div class="lead-msg '+(m.role==="user"?'visitor':'assistant')+'"><small>'+htmlEsc(m.role==="user"?"Visitor":"AI Assistant")+'</small><p>'+htmlEsc(m.content)+'</p></div>').join(""):'<p class="hint">No conversation was linked to this inquiry.</p>')+'</div>';
    $("closeLeadDetail").onclick=()=>panel.classList.add("hidden");
    $("saveLeadStatus").onclick=async()=>{try{await ownerApi("update_lead",{id:lead.id,status:$("leadStatusSelect").value});await loadWorkspace();toast("Lead status updated")}catch(e){toast(e.message)}};
   }catch(e){panel.textContent=e.message}
   panel.scrollIntoView({behavior:"smooth",block:"nearest"});
  });
  window.NexusCalendar?.activate(workspace,ownerApi,loadWorkspace);
  window.NexusInsights?.activate(workspace);
  window.NexusConversationHistory?.activate(workspace,ownerApi);
 }
 if(viewName==="links"&&workspace.store){
  const qrForm=$("qrForm");if(qrForm)qrForm.onsubmit=async event=>{
   event.preventDefault();try{await ownerApi("create_qr",{label:$("qrLabel").value,offeringId:$("qrOffering").value});await loadWorkspace();toast("Tracked QR created")}catch(e){toast(e.message)}
  };
  const settings=$("chatSettingsForm");if(settings)settings.onsubmit=async event=>{
   event.preventDefault();try{await ownerApi("save_chat_settings",{chatMaxMessages:Number($("chatMaxMessages").value),chatMaxMinutes:Number($("chatMaxMinutes").value),appointmentsEnabled:$("appointmentsEnabled").checked});await loadWorkspace();toast("Customer chat limits saved")}catch(e){toast(e.message)}
  };
  document.querySelectorAll("[data-copy-qr]").forEach(button=>button.onclick=()=>navigator.clipboard.writeText(qrSourceUrl(button.dataset.copyQr)).then(()=>toast("QR link copied")).catch(()=>toast("Copy failed")));
  document.querySelectorAll("[data-toggle-qr]").forEach(button=>button.onclick=async()=>{
   const source=(workspace.qrSources||[]).find(s=>s.id===button.dataset.toggleQr);if(!source)return;
   try{await ownerApi("set_qr_enabled",{id:source.id,enabled:!source.enabled});await loadWorkspace();toast("QR code updated")}catch(e){toast(e.message)}
  });
  document.querySelectorAll("[data-print-qr]").forEach(button=>button.onclick=()=>{
   const source=(workspace.qrSources||[]).find(s=>s.id===button.dataset.printQr);if(!source)return;
   const url=qrSourceUrl(source.code);
   const popup=window.open("","_blank","width=550,height=720");
   if(!popup){toast("Allow popups to print QR");return}
   const doc=popup.document;doc.title="NexusSales QR • "+source.label;
   const style=doc.createElement("style");style.textContent="body{font:18px system-ui,sans-serif;text-align:center;color:#174836;padding:32px}h1{font-size:28px}img{width:320px;height:320px}p{overflow-wrap:anywhere}.brand{color:#06a978;font-weight:800}@media print{button{display:none}}";doc.head.append(style);
   const brand=doc.createElement("p");brand.className="brand";brand.textContent="NEXUSSALES AI";doc.body.append(brand);
   const h=doc.createElement("h1");h.textContent=source.label;doc.body.append(h);
   const p=doc.createElement("p");p.textContent="Scan to ask a question or request a callback";doc.body.append(p);
   const img=doc.createElement("img");img.alt="Scan QR";img.src="https://api.qrserver.com/v1/create-qr-code/?size=500x500&data="+encodeURIComponent(url);doc.body.append(img);
   const small=doc.createElement("p");small.textContent=url;doc.body.append(small);
   const print=doc.createElement("button");print.textContent="Print sign";print.onclick=()=>popup.print();doc.body.append(print);
  });
 }
 if(viewName==="testbot"){$("testBotForm").onsubmit=submitTestBot;$("testBotQuestion").onkeydown=e=>{if(e.key==="Enter"&&!e.shiftKey&&!e.isComposing){e.preventDefault();$("testBotForm").requestSubmit()}};}
 if(viewName==="store")$("storeForm").onsubmit=saveStore;
 if(viewName==="offerings"){
  $("addOffering").onclick=()=>editOffering();
  document.querySelectorAll("[data-edit]").forEach(e=>e.onclick=()=>editOffering(e.dataset.edit));
  document.querySelectorAll("[data-delete]").forEach(e=>e.onclick=async()=>{
   if(!confirm("Delete this offering?"))return;
   try{await ownerApi("delete_offering",{id:e.dataset.delete});await loadWorkspace();toast("Offering deleted")}catch(err){toast(err.message)}
  });
 }
 if(viewName==="links"&&workspace.store){
  $("copyLink").onclick=()=>navigator.clipboard.writeText(smartUrl()).then(()=>toast("SmartLink copied")).catch(()=>toast("Unable to copy"));
  const pub=$("publishStore");if(pub)pub.onclick=async()=>{
   if(!confirm(workspace.access.reason==="COMPLIMENTARY"?"Publish your store now? Your complimentary access will remain free.":"Publish your store and start the 48-hour trial now?"))return;
   try{await ownerApi("publish",{});await loadWorkspace();toast("Your store is now live!")}catch(e){toast(e.message)}
  };
  const enable=$("enableWidget");if(enable)enable.onclick=async()=>{try{await ownerApi("enable_widget",{});await loadWorkspace();viewName="links";render();toast("Widget code generated")}catch(e){toast(e.message)}};
  const disable=$("disableWidget");if(disable)disable.onclick=async()=>{if(!confirm("Disable the website widget?"))return;try{await ownerApi("disable_widget",{});await loadWorkspace();viewName="links";render()}catch(e){toast(e.message)}};
  const copyCode=$("copyWidgetCode");if(copyCode)copyCode.onclick=()=>navigator.clipboard.writeText($("widgetCode").value).then(()=>toast("Widget script copied")).catch(()=>toast("Copy failed"));
  const pause=$("pauseStore");if(pause)pause.onclick=async()=>{
   if(!confirm("Unpublish your storefront?"))return;
   try{await ownerApi("pause",{});await loadWorkspace();toast("Store unpublished")}catch(e){toast(e.message)}
  };
 }
}
async function saveStore(e){
 e.preventDefault();
 const store={name:$("storeName").value.trim(),slug:$("storeSlug").value.trim()||cleanSlug($("storeName").value),
  industry:$("storeIndustry").value.trim(),agent_name:$("storeAgent").value.trim(),
  ai_personality:document.querySelector('input[name="storePersonality"]:checked')?.value||"professional",
  headline:$("storeHeadline").value.trim(),description:$("storeDescription").value.trim(),
  hours:$("storeHours").value.trim(),store_image_url:$("storeImage").value.trim()};
 const previous=workspace.store?.slug||"";
 if(previous&&previous!==cleanSlug(store.slug)){
  const changed=cleanSlug(store.slug);
  if(!changed||changed.length<3){toast("SmartLink name must contain at least three letters or numbers");return}
  if(!confirm("Change your SmartLink from /s/"+previous+" to /s/"+changed+"?\\n\\nIMPORTANT: Your old link and QR codes will stop working. Update all places where you shared them. This cannot be automatically undone."))return;
 }
 const button=e.target.querySelector("[type=submit]");const status=$("storeSaveStatus");if(status)status.textContent="Saving business details…";button.disabled=true;
 try{const response=await ownerApi("save_store",{store});if(!response.store?.id)throw Error("Save could not be verified. Please retry.");await loadWorkspace({throwOnError:true});if(workspace.store?.slug!==cleanSlug(store.slug)||workspace.store?.name!==store.name)throw Error("Saved details could not be verified. Please retry.");viewName="store";render();const message=previous&&previous!==workspace.store?.slug?"SmartLink updated. Replace your old links and QR codes.":"Business details saved and verified.";if($("storeSaveStatus"))$("storeSaveStatus").textContent=message;toast(message)}catch(err){if(status?.isConnected)status.textContent=err.message;toast(err.message)}finally{if(button.isConnected)button.disabled=false}
}
function editOffering(id){
 const p=(workspace.offerings||[]).find(x=>x.id===id)||{};
 $("offeringId").value=p.id||"";$("offeringName").value=p.name||"";$("offeringType").value=p.type||"Service";
 $("offeringPrice").value=p.price_label||"";$("offeringDescription").value=p.description||"";$("offeringStatus").value=p.status||"Available";$("offeringImage").value=p.image_url||"";
 text("dialogTitle",p.id?"Edit offering":"Add offering");text("offeringMessage","");$("dialogBackdrop").classList.remove("hidden");$("offeringName").focus();
}
function closeDialog(){$("dialogBackdrop").classList.add("hidden")}
async function saveOffering(e){
 e.preventDefault();
 const offering={id:$("offeringId").value||undefined,name:$("offeringName").value.trim(),type:$("offeringType").value,
  price_label:$("offeringPrice").value.trim(),description:$("offeringDescription").value.trim(),
  status:$("offeringStatus").value,image_url:$("offeringImage").value.trim()};
 try{await ownerApi("save_offering",{offering});closeDialog();await loadWorkspace();viewName="offerings";render();toast("Offering saved")}
 catch(err){text("offeringMessage",err.message)}
}
async function init(){
 authFields();$("authSubmit").disabled=true;
 $("switchAuth").onclick=()=>{signingUp=!signingUp;authFields();text("authMsg","");if(cfg)text("configMessage",signingUp?"Account service connected. Create a new account to begin.":"Account connection ready. Log in with your existing NexusSales email and password.")};
 document.querySelectorAll("[data-account-kind]").forEach(button=>button.onclick=()=>{accountKind=button.dataset.accountKind==="personal"?"personal":"business";signingUp=true;authFields()});
 document.querySelectorAll("[data-start-kind]").forEach(button=>button.onclick=()=>{accountKind=button.dataset.startKind==="personal"?"personal":"business";signingUp=true;authFields();$("signupArea").scrollIntoView({behavior:"smooth"})});
  $("signInTop").onclick=()=>{signingUp=false;authFields();$("signupArea").scrollIntoView({behavior:"smooth"})};
 $("authForm").onsubmit=submitAuth;$("logoutTop").onclick=signOut;$("logoutSide").onclick=signOut;
 $("dialogClose").onclick=closeDialog;$("offeringForm").onsubmit=saveOffering;
 $("dialogBackdrop").addEventListener("click",e=>{if(e.target===$("dialogBackdrop"))closeDialog()});
 const nav=$("sideNav");
 nav.addEventListener("click",event=>{const button=event.target.closest("button[data-view]");if(!button||!nav.contains(button))return;viewName=button.dataset.view;try{render()}catch(error){console.error("Sidebar navigation:",error);toast("Unable to open this page. Please refresh and try again.")}});
 window.NexusFlags?.render();
 window.addEventListener("nexus:language",()=>{if(!workspace)return;const inputs=snapshotActiveInputs();render();restoreActiveInputs(inputs);window.NexusLanguage?.apply()});
 await loadConfig();if(session()&&cfg)await loadWorkspace();else setVisible(false);
}
init();
