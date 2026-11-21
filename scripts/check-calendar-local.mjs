// Local setup diagnostics: never prints tokens, secret values or customer data.
import {existsSync} from "node:fs";
import {resolve} from "node:path";
const configFile=resolve(process.cwd(),".env.local");
if(existsSync(configFile)) {
 try{process.loadEnvFile(configFile)}catch{console.log("[CHECK] .env.local exists but could not be parsed.");process.exitCode=1;}
} else {
 console.log("[INFO] .env.local is missing. General Nexus UI can open, but Google OAuth cannot be completed.");
}
const checks=[
 ["NEXUS_SUPABASE_URL","Development Supabase project URL"],
 ["NEXUS_SUPABASE_SECRET_KEY","Development Supabase service key (or NEXUS_SUPABASE_SERVICE_ROLE_KEY)"],
 ["NEXUS_GOOGLE_CLIENT_ID","Google OAuth Web Client ID"],
 ["NEXUS_GOOGLE_CLIENT_SECRET","Google OAuth Web Client Secret"],
 ["NEXUS_GOOGLE_REDIRECT_URI","Google callback URL"],
 ["NEXUS_GOOGLE_TOKEN_ENCRYPTION_KEY","Google AES-256-GCM encryption key"],
 ["NEXUS_GOOGLE_OAUTH_STATE_SECRET","Google signed OAuth state secret"],
 ["NEXUS_ABUSE_SECRET","Existing abuse-protection secret"]
];
let missing=0;
for(const [name,label] of checks){
 const v=name==="NEXUS_SUPABASE_SECRET_KEY"?(process.env.NEXUS_SUPABASE_SECRET_KEY||process.env.NEXUS_SUPABASE_SERVICE_ROLE_KEY):process.env[name];
 const set=typeof v==="string"&&v.trim().length>0;
 console.log((set?"[OK] ":"[MISSING] ")+label+" ("+name+")");
 if(!set)missing++;
}
const expected="http://127.0.0.1:8788/.netlify/functions/google-calendar-callback";
if(process.env.NEXUS_GOOGLE_REDIRECT_URI&&process.env.NEXUS_GOOGLE_REDIRECT_URI!==expected)console.log("[WARNING] OAuth callback must match your Google Cloud OAuth Client configuration exactly. This local branch expects "+expected);
const key=process.env.NEXUS_GOOGLE_TOKEN_ENCRYPTION_KEY||"";
if(key&&(!/^[0-9a-f]{64}$/i.test(key)))console.log("[WARNING] Encryption key must be exactly 64 hex characters (32 bytes).");
const state=process.env.NEXUS_GOOGLE_OAUTH_STATE_SECRET||"";
if(state&&state.length<32)console.log("[WARNING] OAuth state secret must be at least 32 characters.");
const url=process.env.NEXUS_SUPABASE_URL||"";
if(url.includes("upjlglwojmdjfjtdoxqg"))console.log("[SAFETY] Your local Supabase URL appears to reference the production project. Do not apply calendar schema migrations or run OAuth write tests against it. Use a separate development database.");
console.log(missing?"[INFO] Google Calendar connection cannot finish until these "+missing+" configuration items are added. The existing Nexus UI can still run.":"[READY FOR TEST] Configuration items present. The test database migration and live Google consent still require verification.");
