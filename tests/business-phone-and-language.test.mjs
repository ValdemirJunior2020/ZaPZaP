import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {normalizeProfile} from "../netlify/lib/nexus-business-profile.mjs";
import {phoneReply,replyLanguage,requestedPhone} from "../netlify/lib/business-ai.mjs";

const profile=values=>normalizeProfile({timezone:"UTC",weekly_hours:{mon:[],tue:[],wed:[],thu:[],fri:[],sat:[],sun:[]},closed_dates:[],categories:[],...values});

test("owner phone is private by default, even when a number is stored",()=>{
 const p=profile({phone:"+15551234567"});
 assert.equal(p.phone_public,false);
 assert.match(phoneReply("What is your phone number?",p),/chosen not to share/i);
 assert.doesNotMatch(phoneReply("What is your phone number?",p),/15551234567/);
});

test("public opt-in provides only an E.164 phone, in the customer's language",()=>{
 const p=profile({phone:"+15551234567",phone_public:true});
 assert.match(phoneReply("eu quero o telefone pessoal do dono",p),/15551234567/);
 assert.match(phoneReply("eu quero o telefone pessoal do dono",p),/empresa autorizou/i);
 assert.match(phoneReply("¿Cuál es su teléfono?",p),/15551234567/);
 assert.match(phoneReply("¿Cuál es su teléfono?",p),/empresa autorizó/i);
 assert.equal(phoneReply("What hours are you open?",p),null);
});

test("public phone sharing rejects empty or invalid numbers without breaking private legacy profiles",()=>{
 assert.equal(profile({phone:"5551234567",phone_public:false}).phone_public,false);
 assert.throws(()=>profile({phone:"5551234567",phone_public:true}),/international/);
 assert.throws(()=>profile({phone:"",phone_public:true}),/international/);
});

test("short Portuguese, Spanish and English queries determine response language",()=>{
 assert.equal(replyLanguage("testando somente"),"pt");
 assert.equal(replyLanguage("eu quero o telefone pessoal do dono"),"pt");
 assert.equal(replyLanguage("hola, quiero saber el precio"),"es");
 assert.equal(replyLanguage("How much is it?"),"en");
 assert.equal(replyLanguage("123", "pt"),"pt");
 assert.equal(requestedPhone("My website is down"),false);
});

test("all sidebar pages load the shared language system and phone opt-in",()=>{
 const html=readFileSync(new URL("../business.html",import.meta.url),"utf8");
 const account=readFileSync(new URL("../account.html",import.meta.url),"utf8");
 const locale=readFileSync(new URL("../nexus-language.js",import.meta.url),"utf8");
 const settings=readFileSync(new URL("../nexus-business-profile-ui.js",import.meta.url),"utf8");
 assert.match(html,/nexus-language\.js/);
 assert.match(account,/nexus-language\.js/);
 assert.match(locale,/Inteligencia de ventas/);
 assert.match(locale,/Salvar agendamento/);
 assert.match(settings,/nxBpPhonePublic/);
});
