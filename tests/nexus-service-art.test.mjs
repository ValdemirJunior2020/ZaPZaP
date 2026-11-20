import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const slugs=["plans-overview","personal-assistant","business-smartstore","website-chatbot","employee-brazil","employee-global","product-catalog","smartlinks-qr","customer-leads","appointments","multilingual","chat-history"];
const asset=name=>new URL("../assets/nexus-services/"+name+".svg",import.meta.url);
test("Each Nexus AI service has its own valid branded SVG image",async()=>{
 assert.equal(slugs.length,12);
 for(const slug of slugs){
  const svg=await readFile(asset(slug),"utf8");
  assert.match(svg,/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
  assert.match(svg,/viewBox="0 0 1200 700"/);
  assert.match(svg,/aria-label="[^"]+"/);
  assert.match(svg,/<\/svg>$/);
  assert.ok(svg.includes('Nexus AI'),slug+" should carry Nexus AI branding");
 }
});
test("Service card renders image URL supplied by store catalog",async()=>{
 const store=await readFile(new URL("../store-live.js",import.meta.url),"utf8");
 const api=await readFile(new URL("../netlify/functions/public-store.mjs",import.meta.url),"utf8");
 assert.match(store,/safeUrl\(p\.image_url\)/);
 assert.match(api,/image_url:x\.image_url/);
});
