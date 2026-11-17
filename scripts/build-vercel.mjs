// Assemble public files only: NEVER copy .env, source server code, SQL, or private tunnel material.
import{mkdir,cp,rm,stat}from"node:fs/promises";
import path from"node:path";
import{fileURLToPath}from"node:url";
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const output=path.join(root,"public");
await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
const allowed=["index.html","business.html","account.html","account-settings.js","admin.html","store.html","widget-chat.html","website-example.html","app.js","business.js","calendar-ui.js","calendar-public.js","demo.js","store-live.js","widget.js","styles.css","business.css","assets"];
for(const name of allowed){
 const origin=path.join(root,name),dest=path.join(output,name);
 let details;try{details=await stat(origin)}catch{throw new Error("Required public file missing: "+name)}
 await cp(origin,dest,{recursive:details.isDirectory()});
}
console.log("Vercel public bundle assembled: "+allowed.length+" allowlisted files/folders. Private project sources excluded.");
