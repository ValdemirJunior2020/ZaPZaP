import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const load=p=>readFile(new URL("../"+p,import.meta.url),"utf8");

test("homepage and business fallback both load the header language scripts",async()=>{
 for(const path of ["index.html","business.html"]){
  const html=await load(path);
  assert.match(html,/src="\/nexus-language\.js"/);
  assert.match(html,/src="\/nexus-flags\.js"/);
  assert.match(html,/href="\/nexus-flags\.css"/);
 }
});
test("flags render in top navigation even without a signed-in sidebar",async()=>{
 const [flags,css]=await Promise.all(["nexus-flags.js","nexus-flags.css"].map(load));
 assert.match(flags,/function renderHeader\(\)/);
 assert.match(flags,/getElementById\("nxHeaderLanguages"\)/);
 assert.match(flags,/header\.insertBefore\(root,nav\)/);
 assert.match(flags,/data-nx-header-language/);
 assert.match(flags,/setLanguage\?\.\(button\.dataset\.nxHeaderLanguage\)/);
 assert.match(flags,/aria-pressed/);
 assert.match(flags,/aria-label/);
 assert.match(css,/\.nx-header-languages/);
 assert.match(css,/max-width:490px/);
 for(const code of ["en","es","pt"])assert.match(flags,new RegExp("\\b"+code+":"));
});
test("marketing and pricing translations are complete and public prices unchanged",async()=>{
 const s=await load("nexus-language.js");
 const home=await load("index.html");
 const essentials=["Features","Pricing","Your business deserves a salesperson who never sleeps.","Start with Business AI","Create my Personal AI","SEE THE AI IN ACTION","SIMPLE PRICING","Create Personal AI","Create Business AI","All prices USD and recurring monthly. A 48-hour business trial starts only after the hosted AI and storefront are activated. Checkout is unavailable until production payment verification is complete. WhatsApp auto-replies require a separately configured and approved WhatsApp Business integration."];
 for(const phrase of essentials)assert.ok(s.includes(JSON.stringify(phrase)),phrase+" needs PT and ES translations");
 for(const amount of ["$15","$499","+$79","$578"])assert.ok(home.includes(amount),amount+" remains accurately priced");
 assert.match(s,/navigator\.languages\?\.\[0\]\|\|navigator\.language/);
 assert.match(s,/nexus_platform_language/);
 assert.match(s,/browserLanguage\(\)\|\|normalize\(/);
});
test("demo preserves real backend while translating example prompts and navigation",async()=>{
 const s=await load("demo.js");
 const translate=await load("nexus-language.js");
 assert.match(s,/translate\(text\)/);
 assert.match(s,/window\.addEventListener\("nexus:language"/);
 assert.match(s,/function select\(business\)/);
 assert.match(s,/\/\.netlify\/functions\/demo-chat/);
 assert.match(translate,/"Which SUV do you offer and what does it cost\?"/);
 assert.match(translate,/"EXAMPLE CATALOG"/);
});
