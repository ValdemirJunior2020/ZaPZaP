import test from"node:test";import assert from"node:assert/strict";
import{catalog,currencyRate,publicHolidays,validCountry,validCurrency}from"../netlify/lib/nexus-free-integrations.mjs";
test("free integrations default to currency only; holidays require opt-in",()=>{
 const x=catalog();assert.ok(x.find(p=>p.id==="frankfurter"&&p.enabled));assert.ok(x.find(p=>p.id==="holidays"&&!p.enabled));assert.equal(validCurrency("USD"),true);assert.equal(validCountry("USA"),false);
});
test("currency lookup validates allowed currency pairs and returns sourced rate",async()=>{
 const fx=await currencyRate("USD","GBP",async(url)=>{assert.equal(url,"https://api.frankfurter.dev/v2/rate/USD/GBP");return{ok:true,json:async()=>({base:"USD",quote:"GBP",rate:0.77,date:"2026-11-20"})}});
 assert.equal(fx.rate,0.77);assert.equal(fx.indicative,true);
 await assert.rejects(currencyRate("../","GBP"),/valid currencies/);
});
test("holiday provider stays disabled by default and never calls provider",async()=>{
 let calls=0;await assert.rejects(publicHolidays(2026,"US",async()=>{calls++;return{ok:true,json:async()=>[]}}),/not enabled/);assert.equal(calls,0);
});
