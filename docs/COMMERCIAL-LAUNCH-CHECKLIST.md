# NexusSales AI — Commercial Launch Gates (19 November 2026)

**Current status: NOT CLEARED FOR PAID PUBLIC LAUNCH.** This is a checklist of observed code and connector evidence, not an assurance of production availability. No payment, DNS, hosting transfer or production deployment is authorized by this file.

## Approved offer boundaries (current code, not a negotiated commercial contract)
- **Personal AI ($15 USD/month):** a shareable **web** assistant link, configured personality and chat interactions. Sharing a link in WhatsApp does **not** mean automatically replying inside a user's existing WhatsApp conversations.
- **Business ($499 USD/month):** SmartStore, business assistant, QR/SmartLinks, lead workflows, 3 employee seats, subject to verified tenant isolation and operational uptime.
- **Additional employee seats:** $30/person/month in Brazil or $50/person/month elsewhere.
- **Website chatbot:** +$79/month on Business ($578 total for base + chatbot).
- Payments are governed by the PayPal LIVE billing backend and are intentionally blocked until `NEXUS_BILLING_ENABLED=true`, with production plans, a verified recurring charge and working webhook.
- A 48-hour trial is defined in code, but starts only when the AI provider and storefront are activated. Validate this end-to-end.

## Findings, ordered by revenue impact
| Priority | Area | Current evidence | Release requirement |
|---|---|---|---|
| P0 | Collect payment | Billing requires LIVE PayPal credentials, exact monthly plans and webhook; not verified in production | Sandbox + live verification: consent, approve, recurring status webhook, cancellation, replays, duplicate checkout protection; then explicitly enable billing |
| P0 | Production deploy | Vercel GitHub integration reported build-rate-limit on last merged main commit | Deploy a reviewed build; receive READY status; run authenticated and public smoke tests |
| P0 | Terms and privacy | No public privacy.html/terms.html in repository | Approve accurate service operator identity, contact/support channel, privacy basis, data processing, refunds, cancellation, retention, and governing terms; add accessible links; legal review recommended |
| P0 | Always-on AI | Ollama is supplied by a protected HTTPS gateway connected to an owner-operated system | Verify uptime monitoring, worker auto-restart, fallback behavior, incident response and realistic availability claims |
| P0 | WhatsApp auto replies | Meta webhook and queued sender code exist, but Vercel retry endpoint has no scheduled production call configured | Establish approved Meta Business integration, opt-in/templates where required, scheduler, delivery monitoring, opt-out; do not sell this feature as live until demonstrated |
| P1 | Chat retention | Chat sessions and messages were observed in Supabase even without leads; history feature was in QA branch | Test new owner-only history view, delete scope, restore/backup handling and retention disclosures |
| P1 | Mobile sharing | Personal link social title and storefront preview exist in source | Test WhatsApp, iOS Safari, Android Chrome; current preview may be cached |
| P1 | Multi-tenant security | Server-scoped DB access and RLS enabled; 18 RLS-without-policy lints reflect service-only tables | Audit privileged function access, ensure no direct customer write roles, test owner A cannot see owner B data |
| P1 | Auth | Supabase advisor warns leaked-password protection disabled | Enable if available, validate sign-up, verification, recovery, account deletion |
| P1 | Performance | 13 unindexed foreign-key notices from Supabase advisor | Review indexes before significant tenant traffic; avoid indiscriminately dropping unused indexes |
| P1 | Content | Landing page displayed obsolete $149/$228 pricing | Corrected in this release branch to match $499/$15/$79 backend (plus approved seat prices) |
| P1 | Future Netlify move | netlify.toml previously published repository root | Corrected in this release branch to publish the allowlisted public build only. No transfer requested |

## Final acceptance tests before first paid customer
1. New owner registers and receives verification email, signs in and sees own dashboard.
2. Owner completes SmartStore and creates assistant; saved values survive refresh and language changes.
3. Customer opens mobile SmartLink, receives an actual AI response from a hosted worker.
4. Anonymous chat appears in **Chat history** even when a visitor sends only "oi"; owner can delete it, with confirmation; no cross-tenant access.
5. Customer sends inquiry and appointment request; owner sees correct customer record, attribution and notes.
6. Account B cannot view/modify Account A catalog, messages, leads, employee info, subscription or calendar.
7. Trial starts at correct event; trial expiration denies premium processing without corrupting history.
8. Personal and Business recurring prices match PayPal plan values before user consent; payment approval *alone* does not grant access.
9. Webhook signature and authoritative PayPal subscription status verified; duplicate events produce no duplicated payment or access grant.
10. Cancellation and account deletion checked against PayPal and Supabase; data rights and support routing documented.
11. AI worker off/unreachable is gracefully handled; monitor errors and alerts; recovery does not require manually restarting Windows.
12. If WhatsApp is sold: inbound webhook signature, queue persistence, scheduler, outbound Meta success, retries, duplicate suppression, consent and unsubscribe verified.
13. Public privacy and terms pages are available, accurate, reviewed, and linked from sign-up and marketing pages.
14. Deployment shows READY and 48-hour runtime/error sampling passes.

## Tool-based verification
- `npm run test:ci` — static/unit/integration tests (mocked; do not prove provider availability)
- `npm run launch:audit` — fail-closed configuration checklist. Run with secure production env in the deployment environment; never print secrets or paste env values into chat.
- Supabase advisor security: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Vercel build-limit issue: https://vercel.com/valdemirjunior2020s-projects?upgradeToPro=build-rate-limit

## Pilot before full public launch
Offer **3 assisted pilots**, each with one live business and a controlled onboarding. Measure first AI response success, qualified leads, time-to-first-value, actual operational cost per tenant, refund/cancellation friction and uptime. Do not charge a recurring fee until checkout, support policies and reliability tests pass. After pilot acceptance, scale only what has measured retention and supportability.
