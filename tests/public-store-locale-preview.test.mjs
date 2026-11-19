import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");

test("Storefront shows an accessible read-more control that retains full source description",async()=>{
 const [html,js]=await Promise.all([read("store.html"),read("store-live.js")]);
 assert.match(html,/id="introToggle"/);
 assert.match(html,/aria-controls="intro" aria-expanded="false"/);
 assert.match(js,/const INTRO_LIMIT=240/);
 assert.match(js,/button\.setAttribute\("aria-expanded",String\(expanded\)\)/);
 assert.match(js,/\$\("introToggle"\)\.onclick/);
 assert.match(js,/\$\("intro"\)\.textContent=expanded\?value:preview\.text/);
});
test("Long descriptions truncate near word boundary, short descriptions stay whole",async()=>{
 const js=await read("store-live.js");
 const match=js.match(/function previewDescription\(description,limit=INTRO_LIMIT\)\{[\s\S]*?\n\}/);
 assert.ok(match);
 const preview=new Function("INTRO_LIMIT",match[0]+";return previewDescription;")(240);
 assert.deepEqual(preview("A short description."),{text:"A short description.",truncated:false});
 const full="Welcome to Nexus AI. "+"Our service helps businesses and customers. ".repeat(14);
 const shortened=preview(full);
 assert.equal(shortened.truncated,true);
 assert.ok(shortened.text.length<=241);
 assert.ok(full.startsWith(shortened.text.slice(0,-1)));
});
test("Brazilian edge country selects Portuguese before employee and browser preferences",async()=>{
 const js=await read("store-live.js");
 const fn=js.match(/function resolveLocale\(country,staffLanguage\)\{[\s\S]*?\n\}/);
 assert.ok(fn);
 const resolve=new Function("navigator",fn[0]+";return resolveLocale;")({languages:["en-US"],language:"en-US"});
 assert.equal(resolve("BR","en_US"),"pt");
 assert.equal(resolve("ES","en_US"),"es");
 assert.equal(resolve(null,"pt_BR"),"pt");
 assert.equal(resolve(null,null),"en");
 assert.match(js,/pageLocale=resolveLocale\(data\.visitorCountry,employee\?\.language\)/);
});
test("Country comes from edge headers rather than request parameters",async()=>{
 const backend=await read("netlify/functions/public-store.mjs");
 assert.match(backend,/x-vercel-ip-country/);
 assert.match(backend,/cf-ipcountry/);
 assert.match(backend,/visitorCountry:/);
 assert.doesNotMatch(backend,/queryStringParameters\?\.country/);
});
