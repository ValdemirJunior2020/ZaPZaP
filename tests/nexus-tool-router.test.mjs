import test from"node:test";import assert from"node:assert/strict";
import{parseCurrencyRequest,currencyContext}from"../netlify/lib/nexus-tool-router.mjs";
test("currency intent works in English, Portuguese and Spanish without a generic keyword match",()=>{
 assert.deepEqual(parseCurrencyRequest("Please convert 100 USD to GBP"),{amount:100,base:"USD",quote:"GBP"});
 assert.deepEqual(parseCurrencyRequest("converter 250 BRL para USD"),{amount:250,base:"BRL",quote:"USD"});
 assert.deepEqual(parseCurrencyRequest("convertir 10 EUR a MXN"),{amount:10,base:"EUR",quote:"MXN"});
 assert.equal(parseCurrencyRequest("Does this hotel accept USD?"),null);
 assert.equal(parseCurrencyRequest("convert 100000000 USD to GBP"),null);
});
test("currency tool only calls provider for explicit valid conversions",async()=>{
 let calls=0;const provider=async(base,quote)=>{calls++;return{base,quote,rate:.8,date:"2026-11-20"}};
 const other=await currencyContext("Can you tell me your refund policy?",provider);assert.equal(other.used,false);assert.equal(calls,0);
 const found=await currencyContext("convert 100 USD to GBP",provider);
 assert.equal(calls,1);assert.match(found.fact,/80 GBP/);assert.match(found.fact,/Indicative reference rate/);
});
test("currency tool fails closed if provider is unavailable",async()=>{
 const r=await currencyContext("convert 5 EUR to USD",async()=>{throw Error("offline")});
 assert.equal(r.used,true);assert.match(r.fact,/Do not invent/);
});
