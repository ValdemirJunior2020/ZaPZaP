import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=name=>readFile(new URL("../"+name,import.meta.url),"utf8");

test("Storefront shows an accessible read-more control that retains full source description",async()=>{
 const [html,js]=await Promise.all([read("store.html"),read("store-live.js")]);
 assert.match(html,/id="introToggle"/);
 assert.match(html,/aria-controls="intro" aria-expanded="false"/);
 assert.match(js,/const INTRO_LIMIT=100/);
 assert.match(js,/button\.setAttribute\("aria-expanded",String\(expanded\)\)/);
 assert.match(js,/\$\("introToggle"\)\.onclick/);
 assert.match(js,/\$\("intro"\)\.textContent=expanded\?value:preview\.text/);
});
test("Long descriptions truncate near word boundary, short descriptions stay whole",async()=>{
 const js=await read("store-live.js");
 const match=js.match(/function previewDescription\(description,limit=INTRO_LIMIT\)\{[\s\S]*?\n\}/);
 assert.ok(match);
 const preview=new Function("INTRO_LIMIT",match[0]+";return previewDescription;")(100);
 assert.deepEqual(preview("A short description."),{text:"A short description.",truncated:false});
 const full="Welcome to Nexus AI. "+"Our service helps businesses and customers. ".repeat(14);
 const shortened=preview(full);
 assert.equal(shortened.truncated,true);
 assert.ok(shortened.text.length<=101);
 assert.ok(full.startsWith(shortened.text.slice(0,-1)));
 assert.equal(preview("A".repeat(100)).truncated,false);
 assert.equal(preview("A".repeat(101)).truncated,true);
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

test("Mobile SmartStore puts a visible Send composer ahead of quick actions and keeps chat history scrollable",async()=>{
 const [html,js]=await Promise.all([read("store.html"),read("store-live.js")]);
 assert.match(html,/id="chatForm" class="chat-form"/);
 assert.match(html,/<textarea id="question"[^>]*rows="2"/);
 assert.match(js,/\$\("question"\)\.onkeydown=e=>\{if\(e\.key==="Enter"&&!e\.shiftKey&&!e\.isComposing\)/);
 assert.match(html,/id="question"[^>]*placeholder="Ask about this business/);
 assert.match(html,/id="chatSend" type="submit">Send<\/button>/);
 assert.match(html,/@media\(max-width:850px\)\{[\s\S]*?\.chat-form\{order:2/);
 assert.match(html,/\.quick\{order:3/);
 assert.match(html,/\.feed\{order:1;[^}]*overflow-y:auto/);
 assert.match(html,/@media\(max-width:510px\)\{[\s\S]*?section\.cover h1\{font-size:clamp\(18px,5vw,22px\)/);
 assert.match(js,/bubble\("user",question\)/);
 assert.match(js,/\$\("chatFeed"\)\.scrollTop=\$\("chatFeed"\)\.scrollHeight/);
});

test("AI chat composers support multiline Shift+Enter and Enter-to-send across store, owner and demo",async()=>{
 const [store,owner,styles,homepage,demo,personal,junior]=await Promise.all(["store.html","business.js","business.css","index.html","demo.js","personal-chat.js","junior.js"].map(read));
 assert.match(store,/<textarea id="question"[^>]*rows="2"/);
 assert.match(store,/\.chat-form textarea\{/);
 assert.match(owner,/<textarea id="testBotQuestion"[^>]*rows="2"/);
 assert.match(styles,/\.testbot-form textarea\{/);
 assert.match(homepage,/<textarea id="demoQuestion"[^>]*rows="2"/);
 assert.match(styles,/\.demo-chat-form textarea\{/);
 for(const js of [await read("store-live.js"),owner,demo,personal,junior]){
  assert.match(js,/e\.key==="Enter"&&!e\.shiftKey/);
  assert.match(js,/requestSubmit\(\)/);
 }
});

test("SmartStore uses a compact animated thinking indicator and replaces it with the AI reply",async()=>{
 const [html,js]=await Promise.all([read("store.html"),read("store-live.js")]);
 assert.match(html,/\.thinking-dots i\{[^}]*animation:thinking-pulse/);
 assert.match(html,/@keyframes thinking-pulse/);
 assert.match(html,/prefers-reduced-motion:reduce/);
 assert.match(js,/pending\.classList\.add\("thinking-bubble"\)/);
 assert.match(js,/pending\.setAttribute\("aria-label",i18n\("loading"\)\)/);
 assert.match(js,/dots\.setAttribute\("aria-hidden","true"\)/);
 assert.match(js,/pending\.append\(dots,label\)/);
 assert.match(js,/pending\.textContent=data\.reply/);
});

test("Nexus AI Support opens an accessible copy-email dialog rather than launching mail",async()=>{
 const pages=await Promise.all(["index.html","business.html","store.html","account.html"].map(read));
 const popup=await read("nexus-support.js");
 const build=await read("scripts/build-vercel.mjs");
 for(const html of pages){
   assert.match(html,/data-nexus-support/);
   assert.match(html,/src="\/nexus-support\.js"/);
   assert.doesNotMatch(html,/mailto:nexusai\.helpdesk@gmail\.com/);
 }
 assert.match(popup,/dialog\.showModal\(\)/);
 assert.match(popup,/navigator\.clipboard\.writeText\(address\)/);
 assert.match(popup,/nexusai\.helpdesk@gmail\.com/);
 assert.match(popup,/dialog\.close\(\)/);
 assert.match(popup,/aria-live="polite"/);
 assert.match(build,/"nexus-support\.js"/);
});

test("Nexus AI homepage embeds the active owner chatbot widget exactly once",async()=>{
 const homepage=await read("index.html");
 const embed='<script src="https://zapzap-bot.netlify.app/widget.js" data-bot-id="bot_c75284b0593d0acd0d39dd60" async></script>';
 assert.equal(homepage.split(embed).length-1,1);
 assert.match(homepage,/src="https:\/\/zapzap-bot\.netlify\.app\/widget\.js"/);
});
