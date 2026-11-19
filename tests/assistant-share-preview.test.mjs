import test from"node:test";
import assert from"node:assert/strict";
import{readFile}from"node:fs/promises";
import{renderAssistantPage}from"../netlify/lib/assistant-share-preview.mjs";
test("personal AI share preview includes a unique crawler-readable title and Open Graph tags",async()=>{
 const template=await readFile(new URL("../personal-chat.html",import.meta.url),"utf8");
 const html=renderAssistantPage(template,{name:"Junior",handle:"junior-ai"});
 assert.match(html,/<title>Hi, I'm Junior, your AI assistant\. How can I help you\?<\/title>/);
 assert.match(html,/<meta property="og:title" content="Hi, I&#39;m Junior, your AI assistant\. How can I help you\?">/);
 assert.match(html,/og:url" content="https:\/\/za-p-za-p\.vercel\.app\/assistant\/junior-ai/);
 assert.match(html,/id="askForm"/);
 assert.match(html,/personal-chat\.js/);
});
test("assistant names are safely escaped, never injected as markup",()=>{
 const html=renderAssistantPage('<title>Your Personal AI · NexusSales</title><meta name="description" content="Meet an AI assistant created with NexusSales AI.">',{name:'<img src=x onerror="oops">',handle:"junior-ai"});
 assert.doesNotMatch(html,/<img/);
 assert.match(html,/&lt;img/);
});
test("route is dynamically served to crawlers rather than rewritten to a static page",async()=>{
 const config=JSON.parse(await readFile(new URL("../vercel.json",import.meta.url),"utf8"));
 assert.ok(config.rewrites.some(r=>r.source==="/assistant/:handle"&&r.destination.includes("assistant-page")));
 assert.ok(config.functions["api/*.mjs"].includeFiles.includes("personal-chat.html"));
});
