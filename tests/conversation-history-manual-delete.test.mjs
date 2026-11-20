import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
const read=path=>readFile(new URL("../"+path,import.meta.url),"utf8");
test("Owner API lists chats independent of submitted lead requests",async()=>{
 const server=await read("netlify/functions/owner-workspace.mjs");
 assert.match(server,/if\(action==="list_conversations"\)/);
 assert.match(server,/nx_chat_sessions\?store_id=eq\./);
 assert.match(server,/if\(action==="conversation_history"\)/);
 assert.match(server,/nx_chat_messages\?session_id=eq\./);
 assert.match(server,/&store_id=eq\./);
 assert.match(server,/userFrom\(event,c\)/);
});
test("Manual deletion requires confirmation and owner store scope",async()=>{
 const server=await read("netlify/functions/owner-workspace.mjs");
 assert.match(server,/data\.confirm!==true/);
 assert.match(server,/method:"DELETE"/);
 assert.match(server,/nx_chat_sessions\?id=eq\./);
 assert.doesNotMatch(server,/delete from nx_chat_sessions where .*expires_at/i);
});
test("Chat history is reachable inside the leads screen and built for Vercel",async()=>{
 const [dashboard,html,build,client]=await Promise.all(["business.js","business.html","scripts/build-vercel.mjs","nexus-conversation-history.js"].map(read));
 assert.match(dashboard,/id="nxHistoryTab"/);
 assert.match(dashboard,/id="nxHistoryPane"/);
 assert.match(dashboard,/NexusConversationHistory\?\.activate/);
 assert.match(html,/nexus-conversation-history\.js/);
 assert.match(build,/"nexus-conversation-history\.js"/);
 assert.match(client,/list_conversations/);
 assert.match(client,/conversation_history/);
 assert.match(client,/delete_conversation/);
 assert.match(client,/Delete this conversation and all its messages permanently/);
});
