// Read-only commercial readiness audit. Never prints secrets or enables payment.
// Run with production environment set privately: npm run launch:audit
import {readFile,access} from "node:fs/promises";
const root=new URL("../",import.meta.url);
const read=async name=>readFile(new URL(name,root),"utf8");
const exists=async name=>{try{await access(new URL(name,root));return true}catch{return false}};
const errors=[],warnings=[],passed=[];
const check=(condition,ok,bad,{optional=false}={})=>(condition?passed:optional?warnings:errors).push(condition?ok:bad);
const env=process.env;
const [index,account,checkout,build,vercel,netlify]=await Promise.all([
 read("index.html"),read("account.html"),read("netlify/functions/billing-checkout.mjs"),
 read("scripts/build-vercel.mjs"),read("vercel.json").then(JSON.parse),read("netlify.toml")
]);
check(index.includes("$499")&&index.includes("$15")&&index.includes("$578"),"Public prices align with business and personal plans","Public marketing must show $499 business, $15 personal, $578 business+widget");
check(!index.includes("$228/month bundled")&&!index.includes("<strong>$149"),"No legacy plan prices advertised","Legacy $149/$228 prices are still visible");
check(account.includes("$499")&&account.includes("$15"),"Account checkout shows the same base amounts","Account subscription prices are inconsistent");
check(checkout.includes('NEXUS_BILLING_ENABLED')&&checkout.includes('validMonthlyPlan'),"Billing is server-gated and validates PayPal plans","Billing has lost its verified plan safety gate");
check(build.includes('allowed=[')&&!build.includes('"netlify/lib"'),"Vercel uses allowlisted public assets","Vercel static bundle should allowlist only public files");
check(/publish\s*=\s*"public"/.test(netlify),"Netlify deploys only the public asset directory","Netlify must not publish the repository root");
check(vercel.rewrites.some(x=>x.source==="/assistant/:handle"),"Vercel routes personal assistant links","Personal assistant routes missing");
check(await exists("nexus-conversation-history.js"),"History viewer exists for no-lead chats","Conversation history viewer missing");
const [ownerCode,appCode]=await Promise.all([read("netlify/functions/owner-workspace.mjs"),read("business.js")]);
check(ownerCode.includes('action==="initialize_personal_workspace"')&&appCode.includes('data-account-kind')===false&&appCode.includes('accountKind==="personal"'),"Personal signup and private workspace logic present","Personal signup or private workspace path is missing");
check(ownerCode.includes('action==="activate_personal"')&&ownerCode.includes("verifyHostedAI()"),"Personal trial requires explicit hosted AI verification","Personal trial must fail closed without live AI");

check(await exists("tests/conversation-history-manual-delete.test.mjs"),"History deletion has regression tests","Missing conversation deletion tests");
const legal=await exists("privacy.html")&&await exists("terms.html");
check(legal,"Privacy and Terms are published for review","Missing public Privacy Policy or Terms of Service: get legal review before charging");
const httpsGateway=(()=>{try{const u=new URL(env.NEXUS_OLLAMA_URL||"");return u.protocol==="https:"&&!u.username&&!u.password&&u.pathname==="/"}catch{return false}})();
check(httpsGateway&&Boolean(env.NEXUS_OLLAMA_GATEWAY_TOKEN)&&env.NEXUS_LIVE_CHAT_ENABLED==="true","Secure Ollama gateway configured","Live Ollama gateway not configured/verified");
check(Boolean(env.NEXUS_SUPABASE_URL)&&Boolean(env.NEXUS_SUPABASE_SECRET_KEY||env.NEXUS_SUPABASE_SERVICE_ROLE_KEY)&&Boolean(env.NEXUS_SUPABASE_PUBLISHABLE_KEY),"Dedicated Supabase credentials configured","Supabase production configuration incomplete");
check(Boolean(env.NEXUS_ABUSE_SECRET)&&env.NEXUS_ABUSE_SECRET.length>=32,"Abuse controls use a configured secret","Production abuse-protection secret missing");
const billing=env.NEXUS_BILLING_ENABLED==="true"&&env.PAYPAL_MODE==="live";
check(billing&&Boolean(env.PAYPAL_CLIENT_ID&&env.PAYPAL_CLIENT_SECRET&&env.PAYPAL_WEBHOOK_ID&&env.PAYPAL_BUSINESS_PLAN_ID&&env.PAYPAL_PERSONAL_BASIC_PLAN_ID),"Live PayPal environment configured","PayPal LIVE checkout is not configured/enabled");
check(Boolean(env.NEXUS_LIVE_CHAT_ENABLED==="true"),"Live chat feature explicitly enabled","Live customer chat not enabled");
const wa=Boolean(env.WHATSAPP_VERIFY_TOKEN&&env.WHATSAPP_APP_SECRET&&env.WHATSAPP_ACCESS_TOKEN&&env.CRON_SECRET);
const schedule=Array.isArray(vercel.crons)&&vercel.crons.some(x=>x.path==="/api/whatsapp-retry");
check(wa&&schedule,"WhatsApp webhook and scheduled worker configured","WhatsApp automatic replies cannot be advertised as active on Vercel: delivery worker has no verified production schedule",{optional:true});
check(await exists("docs/COMMERCIAL-LAUNCH-CHECKLIST.md"),"Operator sales checklist exists","Commercial launch checklist missing");
const result={ready:errors.length===0,passed,warnings,blocked:errors};
console.log(JSON.stringify(result,null,2));
if(errors.length)process.exitCode=1;
