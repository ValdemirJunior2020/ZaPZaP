# ZaPZaP WhatsApp real-message testing

This is a **single-business inbound-reply test integration**, not the multi-tenant production API.

## Meta setup (official WhatsApp Cloud API)

1. Create a Meta Developer app and add the WhatsApp product. In the API Setup page, note the temporary access token, test Phone Number ID, and the allowed recipient number.
2. In Netlify > ZaPZaP > Project configuration > Environment variables, set:
   - `WHATSAPP_VERIFY_TOKEN` — a long random string **you create**.
   - `WHATSAPP_APP_SECRET` — Meta app secret (App Settings > Basic).
   - `WHATSAPP_PHONE_NUMBER_ID` — the Phone Number ID from Meta API Setup.
   - `WHATSAPP_ACCESS_TOKEN` — your access token. Temporary test tokens expire; production needs managed long-lived credentials.
   - `ZAP_BUSINESS_NAME`, `ZAP_BUSINESS_PRODUCTS`, `ZAP_BUSINESS_HOURS` — the business this single-number test represents.
   - Optional `OPENAI_API_KEY` and `OPENAI_MODEL` to enable real LLM-based replies. Without an OpenAI key, this test uses a safe scripted response (not Ollama).
3. Redeploy so Netlify Functions receives the environment variables.
4. In Meta WhatsApp > Configuration, set Callback URL:
   `https://zapzap-bot.netlify.app/.netlify/functions/whatsapp`
   Use the exact same Verify Token as in Netlify. Subscribe to **messages**.
5. Send a message **to the Meta test business number from the recipient number you registered**. Check Netlify function logs for errors.

A green verification check does not mean messages will flow unless you subscribed to `messages`. Test-mode recipient restrictions apply. You must configure the official app/number — this assistant cannot create the Meta tokens on your behalf.

## Ollama integration

The hosted Netlify Function does not have access to your personal computer's `localhost:11434`. The local dashboard's Ollama option is for a separately hosted Node server. Connect via a secure, authenticated private worker/tunnel; do not publish Ollama's port to the open Internet. This WhatsApp function uses a scripted response or OpenAI if a **server-side** API key is configured.

## Not yet production

This test is for a **single Meta number**. Persistent deduplication, 24-hour customer-service-window checks, retries, consent management, per-tenant WhatsApp credentials, user authentication and billing enforcement remain necessary for a commercial SaaS. Never put tokens in frontend files or commit them to GitHub.

## Troubleshooting

- `403 Invalid signature`: your Meta app secret is wrong or the incoming request is not from Meta.
- `503 Webhook not configured`: the Netlify environment variable is missing or the function has not been redeployed.
- `502 WhatsApp delivery failed`: check Netlify function logs for the Meta API status; common causes are expired token or incorrect Phone Number ID.
- No messages: verify app subscriptions to `messages`, recipient permissions, and event logs.

