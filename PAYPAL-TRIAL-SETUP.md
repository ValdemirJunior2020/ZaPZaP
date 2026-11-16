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
| PAYPAL_PLAN_ID | No | Existing PayPal ACTIVE monthly subscription plan ID beginning `P-` |
| PAYPAL_WEBHOOK_ID | No | Webhook ID for the app/environment |
| PAYPAL_MODE | No | `sandbox` while testing; `live` when fully validated |
| NEXUS_BILLING_ENABLED | No | `false` by default; set to `true` **only** after launch readiness |
| NEXUS_ADMIN_PIN | **YES** | Separate private admin login (already created in earlier release) |
| NEXUS_ADMIN_SESSION_SECRET | **YES** | Cryptographic session signing key |

Configure for the Netlify **Functions** runtime and correct deploy context, then redeploy.

## PayPal developer setup

1. Create PayPal Business sandbox app in https://developer.paypal.com/dashboard/applications/sandbox
2. Create product and recurring billing plan (monthly; no second PayPal trial needed because your app offers its own 48 hours).
3. Activate the plan and set `PAYPAL_PLAN_ID`.
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
