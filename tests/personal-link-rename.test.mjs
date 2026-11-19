import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const source=async path=>readFile(new URL("../"+path,import.meta.url),"utf8");

test("existing personal link ID is editable with an explicit rename warning",async()=>{
 const js=await source("business.js");
 assert.match(js,/Personal link ID \(editable\)/);
 assert.doesNotMatch(js,/saved\?'readonly'/);
 assert.match(js,/Change your personal assistant link from/);
 assert.match(js,/Your old shared link will stop working/);
 assert.match(js,/saved\.assistant\?\.handle!==assistant\.handle/);
});
test("backend checks collision and keeps the update scoped to authenticated owner",async()=>{
 const server=await source("netlify/functions/owner-workspace.mjs");
 assert.doesNotMatch(server,/Public link cannot be changed after creation/);
 assert.match(server,/nx_personal_assistants\?handle=eq\./);
 assert.match(server,/This personal link ID is already in use/);
 assert.match(server,/nx_personal_assistants\?on_conflict=owner_id/);
});
test("personal link editor label has three language options",async()=>{
 const language=await source("nexus-language.js");
 assert.match(language,/Personal link ID \(editable\)/);
 assert.match(language,/Identificador do link pessoal \(editável\)/);
 assert.match(language,/Identificador del enlace personal \(editable\)/);
});
