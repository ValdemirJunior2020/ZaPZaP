const $=id=>document.getElementById(id);
const escapeHtml=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const cleanSlug=s=>String(s||"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]/g,"-").replace(/-+/g,"-").replace(/^-|-$/g,"").slice(0,48);
let cfg=null,signingUp=true,viewName="overview",workspace=null,busy=false;
const sessionKey="nexus_owner_v1";
const session=()=>{try{return JSON.parse(sessionStorage.getItem(sessionKey)||"null")}catch{return null}};
const saveSession=s=>{if(s)sessionStorage.setItem(sessionKey,JSON.stringify(s));else sessionStorage.removeItem(sessionKey)};
const toast=s=>{$("toast").textContent=s;$("toast").classList.remove("hidden");setTimeout(()=>$("toast").classList.add("hidden"),3400)};
const text=(id,value)=>{const e=$(id);if(e)e.textContent=value};
function setVisible(loggedIn){
 $("marketing").classList.toggle("hidden",loggedIn);$("signupArea").classList.toggle("hidden",loggedIn);
 $("features").classList.toggle("hidden",loggedIn);$("pricing").classList.toggle("hidden",loggedIn);$("liveDemo").classList.toggle("hidden",loggedIn);
 $("workspace").classList.toggle("hidden",!loggedIn);$("topnav").classList.toggle("hidden",loggedIn);$("accountTop").classList.toggle("hidden",!loggedIn);
}
function authFields(){
 $("businessInputs").classList.toggle("hidden",!signingUp);
 $("authBusiness").required=signingUp;$("authPhone").required=signingUp;
 text("authHeading",signingUp?"Create your business account":"Welcome back");
 text("authSub",signingUp?"Add your business details to get started. Your 48-hour trial begins when your AI store goes live.":"Sign in to your business workspace.");
 text("authSubmit",signingUp?"Create account":"Sign in");
 text("switchAuth",signingUp?"Already registered? Sign in":"Need an account? Sign up");
}
async function loadConfig(){
 try{
  const r=await fetch("/.netlify/functions/public-config",{cache:"no-store"});
  if(!r.ok)throw Error("Account service is not connected yet");
  const j=await r.json();
  if(!j.configured||!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(j.supabaseUrl))throw Error("Account service unavailable");
  cfg=j;text("configMessage","Secure account service is connected. Your 48-hour trial starts when your AI store goes live.");
  $("configMessage").classList.add("success");$("authSubmit").disabled=false;
 }catch{
  cfg=null;text("configMessage","Account registration is not active yet. A dedicated NexusSales database must be connected before anyone can create a real account.");$("authSubmit").disabled=true;
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
async function loadWorkspace(){
 try{
  workspace=await ownerApi();
  if(!workspace)throw Error("Unable to load account");
  setVisible(true);
  text("accountLabel",workspace.email||"Account");
  text("sideName",workspace.store?.name||workspace.profile?.business_name||"Your business");
  render();
 }catch(e){toast(e.message);if(/sign in|session|invalid login|unauthorized/i.test(e.message)){saveSession(null);setVisible(false)}else{setVisible(true);$("viewContent").innerHTML='<div class="alert">Business data is temporarily unavailable. Your account has not been logged out. Refresh the page to retry.</div>'}}
}
async function submitAuth(e){
 e.preventDefault();if(busy||!cfg)return;
 const email=$("authEmail").value.trim(),password=$("authPassword").value;
 const name=$("authBusiness").value.trim(),phone=$("authPhone").value.trim();
 if(signingUp&&(name.length<2||phone.replace(/\D/g,"").length<7)){text("authMsg","Enter a business name and valid phone number.");return}
 busy=true;$("authSubmit").disabled=true;text("authMsg","Connecting…");
 try{
  const j=await authRequest(signingUp?"/auth/v1/signup":"/auth/v1/token?grant_type=password",
   {email,password,...(signingUp?{data:{business_name:name,phone}}:{})});
  if(!j.access_token){
   text("authMsg","Account created. Check your email for a confirmation link, then sign in. Your trial hasn't started yet.");
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
 if(r==="PAID")return"Subscription active";
 if(r==="TRIAL")return a.trialHoursLeft+" hours left in trial";
 if(r==="TRIAL_EXPIRED")return"Trial ended • subscription required";
 return"48-hour trial available";
}
function isEditable(){return workspace?.access?.reason!=="TRIAL_EXPIRED"&&workspace?.access?.reason!=="NO_ACCOUNT"}
const htmlEsc=escapeHtml;
const productName=p=>escapeHtml(p?.name||"Offering");
function render(){
 const titles={overview:["BUSINESS OVERVIEW","Your business command center","Set up and publish your SmartStore."],
 store:["BUSINESS SETTINGS","Set up your SmartStore","Teach the AI what your company does."],
 offerings:["PRODUCTS & SERVICES","What you sell","Enter your actual offerings, prices and details."],
 links:["CUSTOMER SMARTLINKS","One link. Every customer.","Share your storefront via email, text and QR code."],
 leads:["YOUR INQUIRIES","Customer leads","People interested in your products and services."],
 billing:["48-HOUR TRIAL & BILLING","Your subscription","Core $149/month, website widget +$79/month."]};
 const t=titles[viewName]||titles.overview;
 text("workspaceEyebrow",t[0]);text("workspaceHeading",t[1]);text("workspaceSubtitle",t[2]);text("trialBadge",statusText());
 document.querySelectorAll("[data-view]").forEach(b=>b.classList.toggle("active",b.dataset.view===viewName));
 const views={overview:renderOverview,store:renderStore,offerings:renderOfferings,links:renderLinks,leads:renderLeads,billing:renderBilling};
 $("viewContent").innerHTML=(views[viewName]||views.overview)();
 bindView();
}
function renderOverview(){
 const s=workspace.store,items=workspace.offerings||[],leads=workspace.leads||[];
 let html='<div class="view-grid"><div class="card"><div class="meta">Published storefront</div><strong class="metric">'+(s?.published?'Live':'Not live')+'</strong><p>'+(s?.published?'Your SmartLink is available to customers.':'Complete setup to publish your business.')+'</p></div><div class="card"><div class="meta">Offerings</div><strong class="metric">'+items.length+'</strong><p>Products, services and consultations</p></div><div class="card"><div class="meta">Customer inquiries</div><strong class="metric">'+leads.length+'</strong><p>Leads linked to this business</p></div></div>';
 if(!workspace.aiConfigured)html+='<div class="alert">Live AI is not yet connected to NexusSales. Your trial will NOT start, and your public store cannot be published until the hosted AI service is configured.</div>';
 else if(!s?.published)html+='<div class="alert success">Your AI service is available. Save your store and offerings, then publish to start the 48-hour trial.</div>';
 if(workspace.access.reason==="TRIAL_EXPIRED")html+='<div class="alert">Your 48-hour trial has ended. A verified PayPal subscription is required to resume your store and AI assistant.</div>';
 html+='<div class="card"><h2>Get ready to sell</h2><p>Tell the assistant what you offer, include real prices and hours, then publish a permanent SmartLink. Customers can ask questions without creating an account.</p><div class="actions"><button class="primary" data-jump="store">Configure business</button><button class="button" data-jump="offerings">Add products or services</button><button class="button" data-jump="links">View SmartLink</button></div></div>';
 return html;
}
function renderStore(){
 const s=workspace.store||{},p=workspace.profile||{};
 return '<div class="card"><form id="storeForm" class="detail-form">'+
 '<label>Business name<input id="storeName" maxlength="150" required value="'+htmlEsc(s.name||p.business_name||"")+'"></label>'+
 '<label>Permanent SmartLink name<input id="storeSlug" maxlength="48" required '+(s.id?'readonly':'')+' value="'+htmlEsc(s.slug||"")+'" placeholder="your-business"></label>'+
 '<label>Industry<input id="storeIndustry" maxlength="100" value="'+htmlEsc(s.industry||"")+'" placeholder="Marketing, plumbing, HVAC, retail, etc."></label>'+
 '<label>AI assistant name<input id="storeAgent" maxlength="70" value="'+htmlEsc(s.agent_name||"Business Assistant")+'"></label>'+
 '<label class="wide">Store headline<input id="storeHeadline" maxlength="180" value="'+htmlEsc(s.headline||"")+'" placeholder="Expert services for your next project"></label>'+
 '<label class="wide">Business description and policies<textarea id="storeDescription" rows="5" maxlength="2500">'+htmlEsc(s.description||"")+'</textarea></label>'+
 '<label>Business hours<input id="storeHours" maxlength="280" value="'+htmlEsc(s.hours||"")+'" placeholder="Mon–Fri 8AM–5PM"></label>'+
 '<label>Store cover image URL (HTTPS)<input id="storeImage" type="url" value="'+htmlEsc(s.store_image_url||"")+'" placeholder="https://..."></label>'+
 '<div class="wide actions"><button class="primary" type="submit" '+(!isEditable()?'disabled':'')+'>Save business details</button></div></form>'+
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
 '<div class="actions"><button id="publishStore" class="primary" '+(!workspace.aiConfigured||!isEditable()||!(workspace.offerings||[]).length||s.published?'disabled':'')+'>Publish store & start trial</button>'+
 (s.published?'<button id="pauseStore" class="button">Unpublish store</button>':'')+'</div></div>'+
 '<div class="card"><h2>Website widget • +$79/month</h2><p>Embed your AI salesperson on an existing website. The 48-hour trial includes widget access; after the trial, an active $228/month bundled subscription is required.</p>'+(
 workspace.bot?.enabled?'<label>Install script (add before the closing body tag)<textarea id="widgetCode" rows="3" readonly>'+htmlEsc('<script src="'+location.origin+'/widget.js" data-bot-id="'+workspace.bot.bot_id+'" async></'+'script>')+'</textarea></label><div class="actions"><button class="button" id="copyWidgetCode">Copy widget code</button><button class="button danger" id="disableWidget">Disable widget</button></div>':
 '<div class="actions"><button class="button" id="enableWidget" '+(!workspace.widgetAllowed||!s.published?'disabled':'')+'>Generate my website widget</button></div>'
 )+(!workspace.widgetAllowed?'<p class="hint">The website widget requires an active bundled subscription after the trial.</p>':'')+'</div>';
 return body;
}
function renderLeads(){
 const leads=workspace.leads||[];
 if(!leads.length)return'<div class="empty">No customer inquiries yet. Leads from your published store will appear here.</div>';
 return '<div class="card"><div style="overflow:auto"><table class="data-table"><thead><tr><th>Customer</th><th>Contact</th><th>Interest</th><th>Date</th></tr></thead><tbody>'+
 leads.map(l=>'<tr><td><b>'+htmlEsc(l.customer_name)+'</b></td><td>'+htmlEsc(l.customer_email)+'<br>'+htmlEsc(l.customer_phone||"")+'</td><td>'+htmlEsc(l.interest)+'</td><td>'+htmlEsc(new Date(l.created_at).toLocaleDateString())+'</td></tr>').join("")+'</tbody></table></div></div>';
}
function renderBilling(){
 const a=workspace.access||{},url="/account.html";
 const status=a.reason==="TRIAL"?"Your trial ends "+new Date(a.trialEndsAt).toLocaleString():a.reason==="PAID"?"Your account is subscribed.":a.reason==="TRIAL_EXPIRED"?"The trial has ended.":"The 48-hour trial has not started. It begins when your live AI store is published.";
 return '<div class="card"><h2>'+htmlEsc(statusText())+'</h2><p>'+htmlEsc(status)+'</p><div class="view-grid"><div><strong class="metric">$149<small>/mo</small></strong><p>Core store, AI salesperson, SmartLinks and leads.</p></div><div><strong class="metric">$228<small>/mo</small></strong><p>Core + embedded website widget ($79 add-on).</p></div></div><div class="actions"><a class="primary" href="'+url+'">Manage PayPal subscription</a></div><p class="hint">Checkout remains disabled until billing, provider and database integrations pass production validation.</p></div>';
}
function bindView(){
 document.querySelectorAll("[data-jump]").forEach(e=>e.onclick=()=>{viewName=e.dataset.jump;render()});
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
   if(!confirm("Publish your store and start the 48-hour trial now?"))return;
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
  headline:$("storeHeadline").value.trim(),description:$("storeDescription").value.trim(),
  hours:$("storeHours").value.trim(),store_image_url:$("storeImage").value.trim()};
 const button=e.target.querySelector("[type=submit]");button.disabled=true;
 try{await ownerApi("save_store",{store});await loadWorkspace();viewName="offerings";render();toast("Business saved")}catch(err){toast(err.message)}finally{button.disabled=false}
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
 $("switchAuth").onclick=()=>{signingUp=!signingUp;authFields();text("authMsg","")};
 $("signInTop").onclick=()=>{signingUp=false;authFields();$("signupArea").scrollIntoView({behavior:"smooth"})};
 $("authForm").onsubmit=submitAuth;$("logoutTop").onclick=signOut;$("logoutSide").onclick=signOut;
 $("dialogClose").onclick=closeDialog;$("offeringForm").onsubmit=saveOffering;
 $("dialogBackdrop").addEventListener("click",e=>{if(e.target===$("dialogBackdrop"))closeDialog()});
 document.querySelectorAll("[data-view]").forEach(e=>e.onclick=()=>{viewName=e.dataset.view;render()});
 await loadConfig();if(session()&&cfg)await loadWorkspace();else setVisible(false);
}
init();
