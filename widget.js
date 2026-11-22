(()=>{"use strict";
const script=document.currentScript;
if(!script)return;
const botId=(script.dataset.botId||script.dataset.business||"").trim();
if(!/^[a-zA-Z0-9_-]{4,80}$/.test(botId)){console.warn("NexusSales widget: valid data-bot-id required");return}
const origin=new URL(script.src).origin;
const color=/^#[0-9a-f]{6}$/i.test(script.dataset.color||"")?script.dataset.color:"#06a978";
const title=(script.dataset.label||"Chat with us").slice(0,40);
const instanceId="nexus-widget-"+botId;
if(document.getElementById(instanceId))return;
const mounted=()=> {
 if(document.getElementById(instanceId))return;
 const host=document.createElement("div");host.id=instanceId;
 // Only the host is added to the site; all styling is inside our shadow root.
 host.style.cssText="position:fixed;right:0;bottom:0;z-index:2147483000";
 const shadow=host.attachShadow({mode:"open"});
 const style=document.createElement("style");
 style.textContent=`
 *,*::before,*::after{box-sizing:border-box}
 :host{all:initial;position:fixed;inset:auto 0 0 auto;z-index:2147483000;font:14px system-ui,sans-serif}
 .dock{position:fixed;right:20px;bottom:20px;display:flex;flex-direction:column;align-items:flex-end;gap:12px;pointer-events:none}
 button,.panel{pointer-events:auto}
 .trigger{display:flex;align-items:center;gap:9px;min-width:56px;min-height:56px;padding:0 18px;border:0;border-radius:40px;background:var(--nexus-color);color:white;font:700 14px system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px #082d2450}
 .trigger:focus-visible{outline:3px solid #162c27;outline-offset:3px}
 .panel{display:none;width:min(365px,calc(100vw - 32px));height:min(535px,calc(100dvh - 95px));border:1px solid #d8eee4;border-radius:17px;box-shadow:0 18px 45px #10292038;overflow:hidden;background:#fff}
 .panel.open{display:block}
 iframe{width:100%;height:100%;border:0;display:block;background:white}
 @media(max-width:480px){.dock{right:12px;bottom:12px}.panel{width:calc(100vw - 24px);height:min(570px,calc(100dvh - 84px))}}
 `;
 const dock=document.createElement("div");dock.className="dock";dock.style.setProperty("--nexus-color",color);
 const panel=document.createElement("div");panel.className="panel";panel.id="nexusPanel";
 const iframe=document.createElement("iframe");iframe.title="NexusSales customer assistant";iframe.setAttribute("allow","");iframe.setAttribute("referrerpolicy","strict-origin-when-cross-origin");
 iframe.src=origin+"/widget-chat.html?bot="+encodeURIComponent(botId);
 panel.append(iframe);
 // Only the genuine signed-in Nexus dashboard may pass its owner JWT to the
 // trusted widget origin. Third-party customer sites never receive this token.
 const nexusHost=location.origin===origin || /^(?:localhost|127\.0\.0\.1):8788$/.test(location.host)&&location.protocol==="http:";
 const dashboardAuth=()=>{
   if(!nexusHost)return "";
   try{
     const entry=JSON.parse(sessionStorage.getItem("nexus_owner_v1")||"null");
     if(!entry?.access_token||(entry.expires_at&&Date.now()/1000>entry.expires_at-60))return "";
     return String(entry.access_token);
   }catch{return ""}
 };
 const ownerHandoff=event=>{
   if(event.source!==iframe.contentWindow || event.origin!==origin)return;
   if(event.data?.type!=="nexus-widget-owner-auth-request" || event.data?.botId!==botId)return;
   const token=dashboardAuth();
   if(token)iframe.contentWindow?.postMessage({type:"nexus-widget-owner-auth-response",botId,token},origin);
 };
 window.addEventListener("message",ownerHandoff);
 const button=document.createElement("button");button.className="trigger";button.type="button";button.setAttribute("aria-controls","nexusPanel");button.setAttribute("aria-expanded","false");button.textContent="✦ "+title;
 let open=false;
 const toggle=(force)=>{open=typeof force==="boolean"?force:!open;panel.classList.toggle("open",open);button.setAttribute("aria-expanded",String(open));button.textContent=open?"× Close chat":"✦ "+title};
 button.addEventListener("click",()=>toggle());
 dock.append(panel,button);shadow.append(style,dock);document.body.append(host);
 // Optional developer API; never grants access or exposes private settings.
 window.NexusSalesWidgets=window.NexusSalesWidgets||{};
 window.NexusSalesWidgets[botId]={open:()=>toggle(true),close:()=>toggle(false)};
 };
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",mounted,{once:true});else mounted();
})();