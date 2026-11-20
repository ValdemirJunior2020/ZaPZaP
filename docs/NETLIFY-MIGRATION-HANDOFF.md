# NexusSales AI — Netlify Starter migration handoff
Status: **migration preparation only; NOT authorized for commercial payment or DNS cutover.**

## Existing services
- Original production stays at https://za-p-za-p.vercel.app — do not pause, redirect, or change DNS.
- Netlify Starter site exists: https://zapzap-bot.netlify.app
- Site ID: `531a0f22-caa1-4866-a60a-badbfe4c5413`; team plan: `nf_team_dev`.
- A production deploy on Netlify was marked ready by Netlify, but **live account, AI, signing, purchase, and payment flows have NOT been end-to-end verified**.
- `netlify.toml` builds and publishes from the `public/` allowlist after tests. The migration branch repairs permanent `/assistant/:handle`, `/assistant`, and `/junior` Netlify routes.
- Latest commercial changes are in separate PRs **#23** (sales/payment URL + phone permission) and **#24** (three homepage flags + EN/PT/ES). Neither is merged into main as of this handoff.

## Environment variable inventory (key names only — never paste secret values into Docs, issues, GitHub, or email)

These 10 keys were **already present** in Netlify on Nov 20, 2026. Their production records reported a nonempty value; authenticity/functional validity was not assessed. **Never overwrite them with placeholders:**

`NEXUS_ABUSE_SECRET`
`NEXUS_ADMIN_PIN`
`NEXUS_ADMIN_SESSION_SECRET`
`NEXUS_LIVE_CHAT_ENABLED`
`NEXUS_OLLAMA_GATEWAY_TOKEN`
`NEXUS_OLLAMA_MODEL`
`NEXUS_OLLAMA_URL`
`NEXUS_SUPABASE_PUBLISHABLE_KEY`
`NEXUS_SUPABASE_SECRET_KEY`
`NEXUS_SUPABASE_URL`

The following **12 keys from the user's original Vercel-protected list were absent** from Netlify and must be added by an authorized account holder. Most are secrets; leave the corresponding feature disabled until correctly configured:

`CRON_SECRET`
`NEXUS_BILLING_ENABLED`
`PAYPAL_CLIENT_ID`
`PAYPAL_CLIENT_SECRET`
`PAYPAL_MODE`
`PAYPAL_PLAN_ID` (legacy; not sufficient for new checkout)
`PAYPAL_WEBHOOK_ID`
`PAYPAL_WIDGET_BUNDLE_PLAN_ID` (legacy)
`WHATSAPP_ACCESS_TOKEN`
`WHATSAPP_APP_SECRET`
`WHATSAPP_PHONE_NUMBER_ID`
`WHATSAPP_VERIFY_TOKEN`

**Additional keys required by the current new-plan implementation** but NOT included in that older protected list: 
`PAYPAL_BUSINESS_PLAN_ID`
`PAYPAL_PERSONAL_BASIC_PLAN_ID`
`PAYPAL_WIDGET_ADDON_PLAN_ID`
`PAYPAL_EXTRA_EMPLOYEE_BR_PLAN_ID`
`PAYPAL_EXTRA_EMPLOYEE_GLOBAL_PLAN_ID`

Review also any enterprise-specific PayPal plan IDs before exposing enterprise billing; do not invent values.

## Netlify environment setup — access blocker
On Nov 20, 2026, the connected Netlify API **successfully read existing variables** but rejected an attempt to create `CRON_SECRET` with an empty value with **HTTP 403**. Consequently **none of the 12 absent variables was created by this automation**. Access rights and/or the empty-value requirement need to be resolved in the Netlify UI: https://app.netlify.com/projects/zapzap-bot

Add each missing variable under **Environment variables** with the correct value, mark tokens/PIN/passwords as secret, and scope server credentials to **Functions** and the intended deploy context. Avoid literal `[SENSITIVE]`, `SET_ME`, or fake values: these are not functioning credentials. Set `NEXUS_BILLING_ENABLED=false` until PayPal sandbox + webhook end-to-end verification; keep WhatsApp automation unadvertised until active and tested. Verify `NEXUS_LIVE_CHAT_ENABLED` and gateway availability before promising uptime. Some environment updates take effect only after a new build/deploy. Do not email live values.

## Go-live blockers
1. Verify published Netlify page, public `/s/junior`, `/assistant/junior`, sign-up/login/logout, Supabase data isolation, owner studio, live chat, human handoff, access control and appointment request (not automatic booking).
2. Review/publish actual `privacy.html` and `terms.html` (repository currently has **draft markdown only**). Get appropriate legal review before accepting payments.
3. Confirm dedicated production Netlify Supabase credentials and security, working always-on Ollama gateway and reasonable rate limits, and approved trial settings.
4. Fill missing PayPal keys and **new** plan IDs, verify PayPal live/sandbox mode and webhook subscriptions including cancel/renewal, then explicitly approve billing activation.
5. Add and verify WhatsApp Business integration and delivery scheduler **only if** selling auto-replies. A shareable WhatsApp link is not an automated WhatsApp bot.
6. Merge and retest relevant PRs 23 and 24 when approved. Main is currently older than those previews.
7. Only after launch checklist passes, coordinate DNS/canonical links and optional Vercel shutdown in a distinct user-approved step. Netlify Starter may have platform plan limits; validate traffic/AI function quotas before taking paying customers.

## Recorded constraints
- Owner explicitly requested that Vercel production not be redeployed unnecessarily.
- Never commit environment secrets or expose them in email.
- Migrating site hosting does not migrate external Supabase data, AI gateway process, PayPal applications or WhatsApp configuration.
