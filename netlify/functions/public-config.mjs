const json=(status,body)=>({statusCode:status,headers:{"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"},body:JSON.stringify(body)});
export async function handler(event){
 if(event.httpMethod!=="GET")return json(405,{error:"Method not allowed"});
 const url=(process.env.NEXUS_SUPABASE_URL||"").trim();
 const key=(process.env.NEXUS_SUPABASE_PUBLISHABLE_KEY||"").trim();
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)||!key)return json(503,{configured:false});
 return json(200,{configured:true,supabaseUrl:url,publishableKey:key});
}