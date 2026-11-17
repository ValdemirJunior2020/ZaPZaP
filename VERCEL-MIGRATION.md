# NexusSales AI — Vercel migration

This repository now has a Vercel-compatible deployment **without changing the existing source APIs or database**.

## What moved into the Vercel-compatible build

- Public NexusSales landing page, business-owner dashboard, account pages, SmartStore, image assets, and website widget
- All server endpoints using `/api/*.mjs` wrappers and the existing functions in `netlify/functions/`
- Existing client URLs `/.netlify/functions/... ` are rewritten to Vercel `/api/...`, so you do not need to change the frontend
- Customer SmartLinks `/s/:slug` continue working as a rewrite to `store.html`
- Real Qwen3:8b via the existing protected Cloudflare HTTPS gateway; no OpenAI
- Supabase authentication, owner management, catalog, chatbot, lead collection, billing endpoints, and widget settings

The build copies **only allowlisted static files** into `public/`. SQL files, environment values, local gateway tokens, source functions, and private assets are not copied into the website.

## Create a Vercel deployment from GitHub

1. In Vercel, choose **Add New → Project**, import `ValdemirJunior2020/ZaPZaP`, and select the `main` branch.
2. Vercel should use the checked-in `vercel.json` project settings (Other framework, `node scripts/build-vercel.mjs`, output `public`). Verify these values before the first deploy.
3. In **Project → Settings → Environment Variables**, set the deployment environment values listed below. Set them for Production; add Preview values only if you really need previews. Do not create a new Supabase project.
4. Deploy and verify the dynamic endpoint `/api/public-config`, then sign-in, owner preview, SmartLinks, public Qwen3 chat, lead submissions, and widget behavior. Change third-party webhook URLs only after these work.
5. Keep the existing production site live until the new hostname passes acceptance testing. Never make both platforms process the same WhatsApp webhook simultaneously without verifying deduplication.

## Required private Vercel Environment Variables

| Key | Purpose |
| --- | --- |
| `NEXUS_SUPABASE_URL` | Existing dedicated NexusSales project URL (public) |
| `NEXUS_SUPABASE_PUBLISHABLE_KEY` | Supabase browser publishable key |
| `NEXUS_SUPABASE_SECRET_KEY` | Server-only Supabase secret; **never commit** |
| `NEXUS_ABUSE_SECRET` | Server-only per-IP/client abuse-protection HMAC secret |
| `NEXUS_OLLAMA_URL` | HTTPS URL of the existing protected gateway, ending in `/` |
| `NEXUS_OLLAMA_GATEWAY_TOKEN` | Server-only token matching the local gateway's `.gateway-token` |
| `NEXUS_OLLAMA_MODEL` | `qwen3:8b` |
| `NEXUS_LIVE_CHAT_ENABLED` | `true` |

These keys are stored in the hosting provider's secure environment manager, not in GitHub. The original hosting provider may redact stored secret values, so an automated transfer cannot be assumed. Copy the secrets from their secure source to Vercel privately; do not paste them into chat.

### Additional optional features

For PayPal, leave `NEXUS_BILLING_ENABLED=false` until the Vercel Sandbox checkout and verified webhooks pass tests. When ready, set `PAYPAL_MODE`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_PLAN_ID`, `PAYPAL_WIDGET_BUNDLE_PLAN_ID`, and `PAYPAL_WEBHOOK_ID` privately.

For Meta WhatsApp, set `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_ACCESS_TOKEN`, and `WHATSAPP_PHONE_NUMBER_ID` from the Meta developer configuration. The `/api/whatsapp` endpoint accepts verified webhooks and durably queues messages.

### WhatsApp retry scheduling — not yet automatic on Vercel

The former platform scheduled `whatsapp-retry` every two minutes. Vercel Hobby does **not** provide the equivalent two-minute schedule, so we intentionally do **not** register a misleading or nonfunctional cron schedule. The Vercel adapter exposes `/api/whatsapp-retry`, guarded by a private `CRON_SECRET`, for an eligible scheduler to invoke. Configure a schedule that complies with the hosting plan **before relying on WhatsApp deliveries**. Do not expose the retry endpoint anonymously.

### Vercel Hobby restriction

Vercel's Hobby plan is restricted to non-commercial/personal projects. A **paid NexusSales SaaS is commercial use**, so deploying the paid service on Hobby is not a suitable production solution. Do not turn on paid subscription checkout on Hobby. Consider a commercial-use-permitted free host or an eligible paid hosting plan before taking customer payments.

## Validation

Run `npm run test:ci`. GitHub Actions already runs the regression suite. Additional Vercel-specific tests check request handling, webhook query translation, legacy URL rewrites, and that the published `public/` folder excludes private files.

## Important non-goals

Do not copy secrets into `vercel.json`, `.env.example`, `public/`, or Git history. Do not remove gateway bearer-token verification. A public Ollama gateway without authentication would invite uncontrolled usage, reliability failures, and misuse.
