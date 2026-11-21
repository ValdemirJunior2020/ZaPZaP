// Public APIs selected from github.com/public-apis/public-apis, verified against provider docs.
// Server-side only: never let callers choose arbitrary URLs or provider credentials.
const providers=Object.freeze({
 frankfurter:Object.freeze({name:"Currency conversion",id:"frankfurter",endpoint:"https://api.frankfurter.dev/v2/rate",commercial:true,keyRequired:false,cacheMs:600000}),
 holidays:Object.freeze({name:"Public holidays",id:"holidays",endpoint:"https://date.nager.at/api/v3/PublicHolidays",commercial:"review",keyRequired:false,cacheMs:86400000}),
});
const cache=new Map();
const enabled=id=>id==="frankfurter"?process.env.NEXUS_FX_ENABLED!=="false":id==="holidays"&&process.env.NEXUS_HOLIDAYS_ENABLED==="true";
function catalog(){return Object.values(providers).map(p=>({id:p.id,name:p.name,enabled:enabled(p.id),keyRequired:p.keyRequired,commercialUse:p.commercial,cacheMinutes:p.cacheMs/60000}))}
function validCurrency(v){return /^[A-Z]{3}$/.test(v)}
function validCountry(v){return /^[A-Z]{2}$/.test(v)}
async function request(id,url,fetcher=fetch){
 const item=providers[id];if(!item||!enabled(id))throw Object.assign(new Error("This integration is not enabled"),{status:403});
 const key=id+":"+url,now=Date.now(),prior=cache.get(key);if(prior?.expires>now)return prior.value;
 const response=await fetcher(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(4500)});
 if(!response.ok)throw Object.assign(new Error("Information is temporarily unavailable"),{status:503});
 const data=await response.json();cache.set(key,{value:data,expires:now+item.cacheMs});
 if(cache.size>250){for(const [k,v]of cache){if(v.expires<Date.now()||cache.size>200)cache.delete(k)}}
 return data;
}
async function currencyRate(base,quote,fetcher=fetch){
 const a=String(base||"").toUpperCase(),b=String(quote||"").toUpperCase();
 if(!validCurrency(a)||!validCurrency(b)||a===b)throw Object.assign(new Error("Choose two different valid currencies"),{status:400});
 const data=await request("frankfurter",providers.frankfurter.endpoint+"/"+a+"/"+b,fetcher);
 if(data?.base!==a||data?.quote!==b||!Number.isFinite(data.rate)||data.rate<=0)throw Object.assign(new Error("Exchange rate unavailable"),{status:503});
 return{base:a,quote:b,rate:data.rate,date:data.date,source:"Frankfurter",indicative:true};
}
async function publicHolidays(year,country,fetcher=fetch){
 const y=Number(year),c=String(country||"").toUpperCase();
 if(!Number.isInteger(y)||y<2020||y>2100||!validCountry(c))throw Object.assign(new Error("Choose a valid country and year"),{status:400});
 const data=await request("holidays",providers.holidays.endpoint+"/"+y+"/"+c,fetcher);
 if(!Array.isArray(data))throw Object.assign(new Error("Holidays unavailable"),{status:503});
 return data.filter(x=>typeof x.date==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(x.date)).slice(0,80).map(x=>({date:x.date,name:String(x.name||x.localName||"Holiday").slice(0,90),country:c,global:Boolean(x.global),counties:Array.isArray(x.counties)?x.counties.slice(0,40):[]}));
}
export{providers,catalog,enabled,currencyRate,publicHolidays,validCurrency,validCountry};
