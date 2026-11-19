// Server-rendered metadata: WhatsApp, Facebook and other link crawlers do not run page JavaScript.
export function escapeMeta(value){
 return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
export function renderAssistantPage(template,{name,handle}){
 const assistant=String(name||"").trim().slice(0,50)||"NexusSales AI";
 const title="Hi, I'm "+assistant+", your AI assistant. How can I help you?";
 const description="Chat with "+assistant+", a personal AI assistant powered by NexusSales AI.";
 const url="https://za-p-za-p.vercel.app/assistant/"+encodeURIComponent(handle);
 const tags='<meta property="og:type" content="website">'+
  '<meta property="og:title" content="'+escapeMeta(title)+'">'+
  '<meta property="og:description" content="'+escapeMeta(description)+'">'+
  '<meta property="og:url" content="'+escapeMeta(url)+'">'+
  '<meta name="twitter:card" content="summary">'+
  '<meta name="twitter:title" content="'+escapeMeta(title)+'">'+
  '<meta name="twitter:description" content="'+escapeMeta(description)+'">'+
  '<link rel="canonical" href="'+escapeMeta(url)+'">';
 return template.replace(/<title>[^<]*<\/title>/,'<title>'+escapeMeta(title)+'</title>')
  .replace(/<meta name="description" content="[^"]*">/,'<meta name="description" content="'+escapeMeta(description)+'">'+tags);
}
