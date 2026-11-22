# Nexus AI → WA-AKG → Real WhatsApp (local-only prototype)
Date: November 21, 2026. Branch: feat/wa-akg-local-bridge-20261121.

## What this does
- A **real phone number** can be linked by scanning a WhatsApp QR, through a separately running WA-AKG gateway.
- Nexus's standalone loopback UI at http://127.0.0.1:8791 creates a WA-AKG session, starts it, shows its QR, monitors approved inbound test messages and requests an answer from LOCAL Ollama.
- AI replies go into the SAME private WhatsApp conversation via WA-AKG REST API, **not** a chatbot URL. The website chatbot and official Meta integration remain unchanged.
- **Automatic replies are OFF by default**; test phones must be explicitly whitelisted. No broadcast, groups, automatic cold outreach, or customer-history processing.
- Does NOT use Nexus Supabase, Meta Cloud API credentials, Netlify, Render, or a paid API. Host WA-AKG yourself locally; WA-AKG needs Node and a database (MySQL/PostgreSQL), with its own API key. Your normal local Nexus server on port 8788 is not required for the bridge test.
- Unlike the official WhatsApp Cloud API, WA-AKG uses the unofficial Baileys/WhatsApp Web protocol. Account restriction and disconnection are possible. Do not test on the primary business WhatsApp account.

## Prepare the WA-AKG gateway (separate app)
Follow https://github.com/mrifqidaffaaditya/WA-AKG#-quick-installation
Install into an **independent directory** next to Nexus, and run on port 3000. It requires a database. Never use a production DB or credentials for the gateway. Use the WA-AKG dashboard to create a private API key in Settings > API Keys. The bridge does not install, start or alter WA-AKG's database.

## Tomorrow: two steps at a time
1. Switch Nexus repository to branch **feat/wa-akg-local-bridge-20261121**, pull; then double-click START-WHATSAPP-LOCAL-TEST.bat. It creates .env.wa-local and opens Notepad if absent. Add your WA-AKG key, YOUR OWN spare test phone number, and ensure Ollama qwen3:4b is available.
2. Ensure WA-AKG is running on port 3000. Open http://127.0.0.1:8791 and choose **Create session → Start session → Show QR** (QR may take several seconds). On phone use WhatsApp → Linked Devices → Link a Device. Once CONNECTED, press **Enable replies**; send one message from the whitelisted spare number to your linked test number.

IMPORTANT: The QR flow needs a real running WA-AKG server; this branch was only code-reviewed, not paired to a phone in ChatGPT. Do not claim end-to-end success until local tests confirm it. If no QR appears, check the WA-AKG status/console and API key. WA-AKG's QR endpoint can report 404 while the session initializes.

## Security and operational constraints
- The bridge only listens at 127.0.0.1:8791; endpoints require local Host and same-Origin for POST.
- WA-AKG API key remains server-side in ignored .env.wa-local; never sent to browser or inserted into GitHub, Google Docs, logs, screenshots or Netlify environment.
- It polls WA-AKG chat data locally every five seconds rather than requiring publicly exposed webhooks (WA-AKG rejects non-HTTPS webhook URLs). At arming, existing messages are marked seen and ignored.
- Only 1:1 text messages (not groups, media, status, or broadcasts); allowlist necessary. AI answers use local Ollama and a no-invented-appointments instruction. No booking tools/actions.
- This is a single-PC, single-session TEST LAB, not a multi-tenant production connector. If WA-AKG changes its API payload or limits chat lists, adjust after seeing actual local responses. Multi-tenant secure account-linking needs separate work and a production security review.
- Disarm immediately using Stop replies. Ctrl+C closes the bridge. Never expose the localhost bridge via Cloudflare Tunnel or public port forwarding.
- No production Supabase changes or Netlify builds/deployments allowed without explicit approval.
- Do not commit .env.wa-local. Key must remain secret.
