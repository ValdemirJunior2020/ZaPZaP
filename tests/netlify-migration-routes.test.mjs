import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const config=await readFile(new URL("../netlify.toml",import.meta.url),"utf8");
test("Netlify safely publishes only compiled public assets",()=>{
 assert.match(config,/publish\s*=\s*"public"/);
 assert.match(config,/npm run test:ci && node scripts\/build-vercel\.mjs/);
 assert.match(config,/node_bundler\s*=\s*"esbuild"/);
});
test("Netlify preserves permanent public assistant URLs",()=>{
 for(const pattern of [
  /from\s*=\s*"\/assistant\/:handle"\s+to\s*=\s*"\/\.netlify\/functions\/assistant-page\?handle=:handle"\s+status\s*=\s*200\s+force\s*=\s*true/,
  /from\s*=\s*"\/assistant"\s+to\s*=\s*"\/junior\.html"/,
  /from\s*=\s*"\/junior"\s+to\s*=\s*"\/junior\.html"/,
  /from\s*=\s*"\/s\/:slug"\s+to\s*=\s*"\/store\.html"/
 ])assert.match(config,pattern);
});
test("Netlify does not redirect production traffic to Vercel",()=>{
 assert.doesNotMatch(config,/to\s*=\s*"https:\/\/za-p-za-p\.vercel\.app/);
});
