# NexusSales AI — 48-hour trial + PayPal subscription setup

## Current implementation

The code is committed and deployed in **safe, disabled mode**. It does not charge customers yet.

- `/account.html`: owner email/password signup, sign in, two-day trial status, and PayPal approval link flow.
- `netlify/functions/public-config.mjs`: exposes **only** the public Supabase URL and publishable key.
- `netlify/functions/billing-status.mjs`: verifies Supabase access token via Auth and calculates trial expiry from the database clock, NOT localStorage.
- `netlify/functions/billing-checkout.mjs`: requires logged-in owner, matching subscription plan, same-origin POST and `NEXUS_BILLING_ENABLED=true`. Uses private PayPal OAuth credentials on server. Returns hosted PayPal approve URL. Does **not** activate access on redirect.
- `netlify/functions/billing-webhook.mjs`: verifies each webhook using PayPal's signature verification API, queries authoritative PayPal subscription status, and updates the matching owner entitlement record.
- `supabase/nexussales-trial-paypal.sql`: creates owner-only-read entitlements, starts trial exactly when Auth user is created, and prevents customer extensions or client-side fake payment state.

## Required configuration (Netlify Project > Environment variables)

Never commit any secret or enter it into the dashboard/public JavaScript.

| Setting | Secret? | Purpose |
| --- | --- | --- |
| NEXUS_SUPABASE_URL | No | Dedicated NexusSales Supabase URL |
| NEXUS_SUPABASE_PUBLISHABLE_KEY | No | Supabase public publishable key, never service role |
| NEXUS_SUPABASE_SERVICE_ROLE_KEY | **YES** | Server functions only; read/update billing entitlements |
| PAYPAL_CLIENT_ID | No (server only recommended) | PayPal REST application client ID |
| PAYPAL_CLIENT_SECRET | **YES** | Private PayPal REST application secret |
| PAYPAL_PLAN_ID | No | Core SmartLinks PayPal ACTIVE monthly subscription plan ($149 USD), beginning `P-` |
| PAYPAL_WIDGET_BUNDLE_PLAN_ID | No | Optional bundled plan ($228 USD/month: $149 core + $79 widget add-on) |\n| PAYPAL_WEBHOOK_ID | No | Webhook ID for the app/environment |
| PAYPAL_MODE | No | `sandbox` while testing; `live` when fully validated |
| NEXUS_BILLING_ENABLED | No | `false` by default; set to `true` **only** after launch readiness |
| NEXUS_ADMIN_PIN | **YES** | Separate private admin login (already created in earlier release) |
| NEXUS_ADMIN_SESSION_SECRET | **YES** | Cryptographic session signing key |

Configure for the Netlify **Functions** runtime and correct deploy context, then redeploy.

## PayPal developer setup

1. Create PayPal Business sandbox app in https://developer.paypal.com/dashboard/applications/sandbox
2. Create two monthly recurring plans (no PayPal trial): **NexusSales Core $149 USD/month** and **Core + Website Widget $228 USD/month**. The widget is a $79 add-on, not a replacement for SmartLinks.
3. Activate the Core plan and set `PAYPAL_PLAN_ID`; activate the combined plan and set `PAYPAL_WIDGET_BUNDLE_PLAN_ID`. The checkout function checks the selected plan amount, currency and monthly frequency server-side.
4. Configure a webhook for `https://zapzap-bot.netlify.app/.netlify/functions/billing-webhook`; subscribe to `BILLING.SUBSCRIPTION.ACTIVATED`, `BILLING.SUBSCRIPTION.SUSPENDED`, `BILLING.SUBSCRIPTION.CANCELLED`, `BILLING.SUBSCRIPTION.EXPIRED`, `BILLING.SUBSCRIPTION.UPDATED`.
5. Copy the webhook ID, not a webhook secret. Keep `PAYPAL_MODE=sandbox` for sandbox testing.
6. After end-to-end approval, signature verification, cancellation and trial-expiry tests, obtain Live app keys, plan and webhook ID. Never mix Sandbox and Live IDs.

## Critical unfinished launch gates

- Create separate NexusSales Supabase project. **Do not alter The Good Side.**
- Apply `supabase/nexussales-smartstore.sql` then `supabase/nexussales-trial-paypal.sql` in that project. Run RLS/security advisors.
- Replace browser-only demo data with authenticated, per-owner Supabase records.
- Server-side authorization must protect **all paid operations**, including public AI access, storefront editing and lead retrieval; the current browser dashboard is still a demo and can be opened without a subscription. A client-side banner alone cannot enforce a paywall.
- Add durable shared rate limiting for billing endpoints and protection against scripted trial abuse. Handle session token refresh, email confirmation, password recovery, account deletion, subscription cancellation, and support requests.
- Complete sandbox webhook integration tests, idempotency/reconciliation, refund/payment-failure policy, app Privacy/Terms and final price display before enabling billing.
- Only after these are done set `NEXUS_BILLING_ENABLED=true`. **Until then no money is charged.**

### Prices

The PayPal `PAYPAL_PLAN_ID` is created for an amount and interval of your choosing. The app must display those exact PayPal plan details before collecting payment. Avoid hardcoding prices in an unconnected demo.

### 48-hour trial

`trial_started_at` is generated from the original Supabase Auth signup timestamp via database trigger. A trial can't be restarted by changing browsers, deleting localStorage, or signing in from another device. A user could create a different account unless abuse prevention is implemented.

**Source:** https://developer.paypal.com/api/subscriptions/v1 and https://developer.paypal.com/api/rest/webhooks

## Core product promise and add-on separation

**Never remove or paywall the original customized SmartLinks behind the widget add-on.** Every core subscriber ($149/month, after 48h trial) gets customized links to their SmartStore and AI assistant, email and SMS sharing, QR codes, products/services catalog and lead capture once production features are connected.

The $79/month *optional* widget is a floating chat assistant owners can embed on an existing website via a public bot ID. Bundled billing total **$228/month**. The widget is available during the 48-hour trial for testing, but after trial expiration it must require an active bundled subscription. The widget endpoint must check backend entitlement, never `data-bot-id` as authentication. The browser storefront/links and current widget prototype are not yet connected to a production tenant database.

**Important:** Switching from an already active $149 plan to the $228 plan requires an explicit PayPal subscription revise/upgrade integration plus billing reconciliation. The current checkout prevents a second simultaneous subscription and does not yet support live upgrades. Do not promise upgrades work until that flow is implemented and tested.
