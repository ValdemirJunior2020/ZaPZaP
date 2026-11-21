// Conservative backend-only tool enrichment for NexusSales chat.
// Rate lookups require a clear currency conversion request, never expose user data.
import{currencyRate}from"./nexus-free-integrations.mjs";
const ISO=new Set(["USD","EUR","GBP","BRL","CAD","AUD","JPY","CHF","MXN","INR","CNY","NZD","ZAR","KRW","SEK","NOK","DKK","PLN"]);
function parseCurrencyRequest(message){
 const s=String(message||"").trim().slice(0,700);
 if(!/\b(convert|conversion|exchange|currency|rate|cambio|câmbio|cotação|converter|convertir|conversão|tipo de cambio|taxa de câmbio)\b/i.test(s))return null;
 const m=s.match(/(?:^|\s)([0-9]{1,7}(?:\.[0-9]{1,2})?)\s*(USD|EUR|GBP|BRL|CAD|AUD|JPY|CHF|MXN|INR|CNY|NZD|ZAR|KRW|SEK|NOK|DKK|PLN)\s+(?:to|in|into|para|em|a|en)\s+(USD|EUR|GBP|BRL|CAD|AUD|JPY|CHF|MXN|INR|CNY|NZD|ZAR|KRW|SEK|NOK|DKK|PLN)\b/i);
 if(!m)return null;
 const amount=Number(m[1]),base=m[2].toUpperCase(),quote=m[3].toUpperCase();
 if(!Number.isFinite(amount)||amount<=0||amount>10000000||!ISO.has(base)||!ISO.has(quote)||base===quote)return null;
 return{amount,base,quote};
}
async function currencyContext(message,convert=currencyRate){
 const found=parseCurrencyRequest(message);
 if(!found)return{used:false,fact:""};
 try{
  const rate=await convert(found.base,found.quote);
  if(!rate||rate.base!==found.base||rate.quote!==found.quote||!Number.isFinite(rate.rate)||rate.rate<=0)return{used:true,fact:"Live currency data is unavailable. Do not guess a current exchange rate."};
  const converted=Math.round(found.amount*rate.rate*100)/100;
  return{used:true,fact:"VERIFIED SERVER-SIDE CURRENCY LOOKUP: "+found.amount+" "+found.base+" ≈ "+converted+" "+found.quote+" using "+rate.rate+" "+found.quote+" per "+found.base+" from Frankfurter dated "+String(rate.date||"recent")+". Indicative reference rate only, not a payment quote or guaranteed market price."};
 }catch{
  return{used:true,fact:"Current currency rates could not be verified. Do not invent a live conversion or claim an exchange quote."};
 }
}
export{parseCurrencyRequest,currencyContext};
