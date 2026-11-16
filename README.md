# ZaPZaP — AI WhatsApp Sales SaaS

A polished, responsive, multi-business SaaS demo for AI-powered customer conversations, lead capture, and appointment-oriented sales.

## Demo capabilities

- Fully interactive SaaS dashboard with Overview, AI Studio, Inbox, Leads, Knowledge, Automations, Billing, and Settings.
- Business onboarding wizard, industry presets, configurable agent tone and goals.
- Chat simulator with lead capture, automatic language detection and localized queue acknowledgement.
- Simulated conversations, leads and analytics; persisted in the browser for demonstration.
- An optional Node API using a local Ollama server with an OpenAI-compatible provider switch.
- SQL starter schema for **a dedicated Supabase project**, including row-level security.
- PayPal subscription integration **design / sandbox-ready server endpoints**, not live checkout until credentials are set.
- Official WhatsApp Cloud API webhook **starter**, not connected by default.

## Start the demo

Open `index.html` in a browser, or run `npm install && npm start` and visit `http://localhost:8788`.

For the browser demo alone, no API, account, database, PayPal, or WhatsApp credentials are required. The status reads **Demo mode** and simulated leads are local to your browser.

## Deploy

- **Netlify:** import the repository, publish directory `.`, no build command. A `netlify.toml` is provided.
- **Render:** deploy as a Node web service, build `npm install`, start `npm start`. Use the Render URL for the full-stack hosted demo.
- **Ollama:** on the server, use `OLLAMA_BASE_URL=http://localhost:11434` only if Ollama actually runs on that host. For a local Windows Ollama worker, deploy a private authenticated tunnel or worker; never expose your Ollama port publicly.
- **OpenAI later:** set `AI_PROVIDER=openai`, `OPENAI_API_KEY`, and `OPENAI_MODEL` on your private backend; the key must never enter browser code.

### Recommended backend environment variables

```sh
PORT=8788
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3:8b
# OPENAI_API_KEY=...
# OPENAI_MODEL=gpt-4.1-mini
# SUPABASE_URL=...
# SUPABASE_SERVICE_ROLE_KEY=...  # backend only
# PAYPAL_CLIENT_ID=...
# PAYPAL_CLIENT_SECRET=...
# PAYPAL_ENV=sandbox
# WHATSAPP_VERIFY_TOKEN=...
# WHATSAPP_APP_SECRET=...
# WHATSAPP_ACCESS_TOKEN=...
# WHATSAPP_PHONE_NUMBER_ID=...
```

Without credentials or an attached AI worker, the application intentionally uses a clearly labeled simulated chat response instead of claiming to have processed a real sale.

## Security and production checklist

This is a **professional demo**, not yet a production-ready billing/messaging service. Before accepting customer data or payments: provision a separate Supabase project, apply and test `supabase/schema.sql`, add authentication, enforce per-tenant authorization on all server endpoints, implement PayPal verified webhook handling, connect the official Meta WhatsApp Cloud API with verified webhook signatures, establish opt-in and consent records, set up a persistent queue, rate limits and secret management. Never sell unofficial Baileys sessions as risk-free.

Use separate legal policies, data retention/deletion flows, customer support and monitoring before production. SalesGPT (MIT) can inform a later agent engine integration; this demo uses a small explicitly controlled sales flow rather than copying legacy unmaintained dependencies.
