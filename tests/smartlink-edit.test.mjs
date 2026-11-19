import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

test("existing SmartLink slug input is editable and validated",async()=>{
 const js=await readFile(new URL("../business.js",import.meta.url),"utf8");
 assert.match(js,/SmartLink name \(editable\)/);
 assert.match(js,/id="storeSlug"/);
 assert.doesNotMatch(js,/s\.id\?'readonly'/);
 assert.match(js,/pattern="\[a-z0-9\]/);
});
test("renaming a SmartLink requires explicit warning about broken old URLs",async()=>{
 const js=await readFile(new URL("../business.js",import.meta.url),"utf8");
 assert.match(js,/Your old link and QR codes will stop working/);
 assert.match(js,/confirm\("Change your SmartLink/);
});
test("backend allows account-owned store slug update and detects collision",async()=>{
 const backend=await readFile(new URL("../netlify/functions/owner-workspace.mjs",import.meta.url),"utf8");
 assert.doesNotMatch(backend,/Store links are permanent once created/);
 assert.match(backend,/nx_stores\?slug=eq\./);
 assert.match(backend,/That SmartLink name is already in use/);
 assert.match(backend,/nx_stores\?id=eq\.\"\+encodeURIComponent\(store\.id\)\+\"&owner_id=eq\./);
});
