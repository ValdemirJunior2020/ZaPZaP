# ZaPZaP — Windows 11 setup and real WhatsApp testing

## Step 1 — install the local AI demonstration

Download the repository ZIP while signed into GitHub (private repository). Extract it to a folder on your Windows PC. Double-click `01-INSTALL-ZAPZAP.bat`, then `02-START-ZAPZAP.bat`.

The installer **checks** Node.js and Ollama, opens official installer pages if either is missing, and offers to download the free `qwen3:8b` model only if needed. It does not request administrator privileges.

Open `http://localhost:8788`, go to **AI Agent Studio**, select **Local Ollama**, enter your business information under **Knowledge Base**, and send a message.

The server is bound to `127.0.0.1` (this PC only), not your public internet address. The website at `zapzap-bot.netlify.app` cannot access your local Ollama without a separately configured secure worker connection. Never expose port 11434 directly to the public internet.

## Step 2 — verify a real WhatsApp reply with a Meta test number

Use the official [Meta for Developers](https://developers.facebook.com/apps/) dashboard:

1. Create/select a Meta app with WhatsApp enabled, obtain the **temporary test WhatsApp number**, Phone Number ID and temporary access token; register *your personal phone* as an allowed test recipient.
2. In Netlify's ZaPZaP environment variables, set `WHATSAPP_VERIFY_TOKEN` (your own strong random value), `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `ZAP_BUSINESS_NAME`, and optional `ZAP_BUSINESS_PRODUCTS`/`ZAP_BUSINESS_HOURS`. Redeploy. Do not put credentials in this repo.
3. Register this Callback URL with Meta and subscribe to **messages**: `https://zapzap-bot.netlify.app/.netlify/functions/whatsapp`. Enter the same verification token you stored in Netlify.
4. From your registered personal WhatsApp number, send a message to the **Meta test business number** and observe the response.

**Important:** The currently deployed Netlify webhook uses basic scripted replies, or OpenAI when a server-side `OPENAI_API_KEY` is configured. It does **not yet connect to your Windows Ollama**. Local Ollama test and WhatsApp delivery test are two separate milestones. Connecting the two will require an authenticated worker or private tunnel with reliable uptime.

This is a single-number WhatsApp integration prototype, not yet a multi-tenant commercial SaaS or approved production number onboarding. Production requires signed webhook checks, durable deduplication/queues, business consent, per-client credential isolation, and Meta Business onboarding.
