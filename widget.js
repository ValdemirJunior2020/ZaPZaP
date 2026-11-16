(()=>{'use strict';if(window.ZaPWidget)return;
const script=document.currentScript;const business=(script?.dataset.business||"Business").slice(0,50);const origin=new URL(script.src).origin;
let root,opened=false;
function mount(){
root=document.createElement('div');root.id='zapzap-demo-widget';root.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2147483000;font-family:Arial,sans-serif';
const btn=document.createElement('button');btn.textContent='✦ Chat with AI';btn.setAttribute('aria-label','Open AI assistant');btn.style.cssText='border:0;border-radius:40px;background:#00ad7f;color:white;padding:15px 22px;font-weight:800;box-shadow:0 10px 28px #012f2455;cursor:pointer';
const frame=document.createElement('iframe');frame.title='ZaPZaP assistant demo';frame.setAttribute('loading','lazy');frame.setAttribute('referrerpolicy','no-referrer');frame.src=origin+'/widget-chat.html?business='+encodeURIComponent(business);frame.style.cssText='display:none;width:min(355px,calc(100vw - 36px));height:min(490px,calc(100dvh - 100px));border:1px solid #bfe7d7;border-radius:18px;box-shadow:0 15px 55px #123a3055;background:white;margin-bottom:12px';
btn.onclick=()=>{opened=!opened;frame.style.display=opened?'block':'none';btn.textContent=opened?'× Close assistant':'✦ Chat with AI'};
root.append(frame,btn);document.body.appendChild(root);
window.ZaPWidget={open(){if(!opened)btn.click()},close(){if(opened)btn.click()}}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount()
})();