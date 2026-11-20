// Assemble public files only: NEVER copy .env, source server code, SQL, or private tunnel material.
import{mkdir,cp,rm,stat}from"node:fs/promises";
import path from"node:path";
import{fileURLToPath}from"node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"public");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const allowed=["index.html","business.html","account.html","account-settings.js","admin.html","store.html","junior.html","junior.js","personal-chat.html","personal-chat.js","widget-chat.html","website-example.html","app.js","business.js","leads-calendar.js","nexus-conversation-history.js","nexus-language.js","nexus-support.js","nexus-flags.js","nexus-flags.css","nexus-widget-guide.js","nexus-business-profile-ui.js","nexus-insights.js","nexus-sales-intelligence.mjs","nexus-intelligence.css","nexus-slot-ui.js","demo.js","store-live.js","widget.js","styles.css","business.css","assets"];
for(const name of allowed){
 const origin=path.join(root,name),dest=path.join(output,name);
 let details;try{details=await stat(origin)}catch{throw new Error("Required public file missing: "+name)}
 await cp(origin,dest,{recursive:details.isDirectory()});
}
console.log("Netlify public bundle assembled: "+allowed.length+" allowlisted files/folders. Private project sources excluded.");
