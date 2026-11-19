# NexusSales AI: Ollama-first, OpenAI emergency fallback

## Architecture

- Primary inference remains your private HTTPS Ollama gateway (`NEXUS_OLLAMA_URL`, model `qwen3:8b` by default).
- Optional **paid** fallback is an **explicitly enabled** direct OpenAI Chat Completions API request.
- Existing live SmartStore / website-chat endpoints and authenticated owner AI preview use the new router. The public **fictional demo** does not use the paid fallback.
- Use the existing Node.js backend: **LiteLLM is not required**. No new Python/Docker server, paid SaaS router, SDK dependency, or extra running process.
- Existing response formats, customer-chat quotas, saved lead history and language rules stay in place. Business/tenant data is built server-side; it is never taken from a browser-provided system prompt.

## Failure behavior

1. Try Ollama first. A successful result costs **zero OpenAI API tokens**.
2. Only if Ollama experiences a timeout, connection failure, empty response, HTTP 408/429 or 5xx: consider the fallback.
3. Never pay to mask invalid credentials (Ollama HTTP 401/403), request validation, or client errors.
4. If the feature is off or the key/model is missing, return the original Ollama failure.
5. To use OpenAI, allow the request through **shared Supabase-backed daily and per-minute limits**. If the limiter fails or denies, fail closed. No provider retry is performed.
6. If the OpenAI attempt also fails, return the usual safe unavailable message. Never invent a successful booking, charge, or chat answer.

## Local settings — OFF by default

In your existing private, gitignored `.env.local` (never commit this file):

```ini
NEXUS_OPENAI_FALLBACK_ENABLED=false
OPENAI_API_KEY=YOUR_PRIVATE_API_KEY
NEXUS_OPENAI_MODEL=gpt-4.1-mini
NEXUS_OPENAI_DAILY_MAX_CALLS=50
NEXUS_OPENAI_TENANT_DAILY_MAX_CALLS=10
NEXUS_OPENAI_MAX_OUTPUT_TOKENS=250
```

**Do not paste your API key into GitHub, ChatGPT or browser JavaScript.** Obtain the key from your OpenAI API project, with billing permissions restricted as appropriate. Test with `NEXUS_OPENAI_FALLBACK_ENABLED=false` first; set it to `true` only after confirming the provider, privacy notice and budget settings. Restart `npm start` after editing the private environment file.

Your existing `NEXUS_OLLAMA_URL`, `NEXUS_OLLAMA_GATEWAY_TOKEN`, `NEXUS_LIVE_CHAT_ENABLED`, `NEXUS_ABUSE_SECRET`, and Supabase credentials must remain configured. The shared rate limiter is essential even in local mode.

### Recommended test sequence

```powershell
cd "C:\Users\Valdemir Goncalves\Downloads\ZaPZaP"
git switch feat/exclusive-nexus-sales-expert-20261118
git pull --ff-only origin feat/exclusive-nexus-sales-expert-20261118
npm run check
npm test
npm start
```

1. Open **Test My AI**. With Ollama online, answers should have `source=ollama`.
2. Enable the fallback privately and stop your own Ollama gateway while leaving NexusSales running. Test again; when the service is unavailable, the router can return `source=openai`.
3. Restore Ollama; subsequent replies should return to `source=ollama`.
4. Verify request counts, billing and external spend alerts at your OpenAI project dashboard before considering live use.

## Important money and privacy limitations

- Limits count **OpenAI requests**, not actual USD spend. The request may already be billable when the network reports failure; the router deliberately does not retry.
- Token output is capped; input is also constrained by the business's existing bounded prompt/history. An API project spend alert/budget is essential. Do **not** describe an OpenAI project budget as a guaranteed hard spending cutoff.
- API billing is separate from ChatGPT Plus/Pro.
- On fallback, customer messages and limited history are sent to OpenAI. Review your business privacy notice and disclosures to customers; do not enable until your data-handling policy permits this.
- Do not activate for production by setting an environment flag on Vercel without explicit launch approval.
- No migration is required **for the AI fallback itself**; it reuses the existing durable limiter schema already required by NexusSales.
- All billing/PayPal and employee subscription logic is unchanged.

## Why no LiteLLM?

LiteLLM is useful for more providers and centralized model routing, but with only Ollama and OpenAI here it adds another Python process and additional operational dependencies to the Windows PC. The existing backend now performs the controlled failover directly.
