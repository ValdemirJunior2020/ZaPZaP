# Nexus AI — Safe Performance Optimization Audit (November 22, 2026)

## Scope and operating constraints

Source: actual ZaPZaP GitHub code, based on `feat/whatsapp-customer-ready-copy-20261122`. Working normal website chat, private Test My AI, WhatsApp AI, linked WA-AKG session, account/authentication, booking, payments and persistence must remain compatible.

All work is confined to `perf/nexus-safe-fastpath-20261122`. **No merge to main, no Netlify deployment, no new paid provider, no database migration, and no secret/config changes.** Deployment to an auto-building Netlify branch must not be enabled without separate approval.

## Completed changes

1. **Skeleton loading for public SmartStore**: initial business page now displays a responsive, screen-reader-hidden shimmer skeleton, with reduced-motion support. It disappears on success and on failure; existing errors remain visible.
2. **Lazy catalog images**: public store cards and owner offering cards use `loading="lazy"`, `decoding="async"` and explicit image dimensions matching their existing CSS heights. Above-the-fold logo/hero images and QR behavior remain unchanged.
3. **Team list complexity**: employee QR sources and lead counts are indexed once using Maps. Before: QR lookup and lead scan repeated for every employee, `O(staff × (sources + leads))`; after: `O(staff + sources + leads)`.
4. **Lead list complexity**: one QR source Map replaces repeated source-array scans while building lead cards.
5. **Workspace API read concurrency**: six independent, already-authorized, read-only Supabase queries are now issued concurrently using `Promise.all`. Response shape, authorization, field selection and all write operations remain unchanged. Fail-fast behavior of required reads is retained.
6. **Read-only API timeout**: public store configuration and embedded widget configuration requests now abort after 12 seconds rather than hanging indefinitely. Sending chat messages and submitting customer inquiries were deliberately not changed.
7. **No dependency churn**: `package.json` has zero declared runtime or dev dependencies. No removal is justified; the app is primarily vanilla JavaScript, not React, so `React.memo` or React code splitting is inapplicable.

## Evidence gathered

- Static source inspection and JavaScript syntax checks **PASS** for modified `business.js`, `store-live.js`, `widget-chat.html`, `netlify/functions/owner-workspace.mjs`, and the new test source.
- A synthetic V8 benchmark with **220 employees and 11,000 leads** produced equal QR/count output before and after. Median example measurements were **67 ms for repeated scans, 1 ms for indexed joins** in the available runtime. These are not user-facing loading times, and results vary by machine.
- New `tests/performance-safe.test.mjs` checks skeleton visibility, image lazy loading, API timeouts, backend read batching, output equality and timings for the team association microbenchmark.
- **Full 173+ project regression suite has NOT run in this environment** because the container cannot reach the GitHub repository and lacks a checkout. Run it locally using the existing ONE launcher, which executes `npm run test:ci` before starting services. Do not claim successful functional testing until results are available.
- **No LCP, INP, CLS, WebPageTest/Lighthouse, compression-header or database EXPLAIN measurements** have been captured; those need the running app and representative traffic.

## Evaluated, deferred until measured or separately authorized

- **Search debounce**: existing lead filter is local and does not issue a network query per keystroke. Do not add arbitrary delays to local UI interactions. If a new server-side search field is introduced, use a ~300 ms debounce and AbortController.
- **Caching, CDN, Brotli/Gzip**: Netlify already serves static assets via CDN, and the local server deliberately sends no-store for HTML/JS/CSS to avoid stale code during development. Do not enable long-lived caching on unfingerprinted assets or cache authenticated/private data. Compression must be verified using real response headers before changing hosting settings.
- **SSR/SSG**: public pages are already static HTML with live API data; no wholesale React/SSR migration is justified.
- **Database indexes/N+1 queries**: don't change production schema without slow-query evidence, `EXPLAIN ANALYZE`, and index/write-cost review. Existing leads/appointments queries are bounded but need real production usage to decide whether cursor pagination helps.
- **Streaming AI**: current messaging and WhatsApp logic relies on complete responses, safeguards and sending a finalized message. Streaming should be evaluated in a separate feature flag, not introduced into a live customer channel blindly.
- **Optimistic writes, workers, queues, connection pooling, OpenTelemetry**: postpone until data integrity and operational needs are established; avoid costs and ungrounded architecture changes. Any telemetry must exclude secrets, conversations and personal customer data.

## Local verification (single BAT)

1. In `C:\Users\nobody\Downloads\ZaPZaP`, use `git fetch origin` followed by `git switch perf/nexus-safe-fastpath-20261122` (if not available locally, `git switch --track origin/perf/nexus-safe-fastpath-20261122`).
2. Double-click **`START-LOCAL-INTEGRATIONS.bat`**. It runs the complete existing test suite before launching the local services. If any test fails, do not merge. Compare public SmartStore loading, product image loading, owner dashboard, Test My AI and live WhatsApp on the same PC.

## Release gate

Get green full tests; inspect page layout on mobile/desktop, owner session and normal customer chat limits, multilingual pages and WhatsApp replies. Record local network timings and browser Web Vitals. Only after success, request explicit permission before merging to `main` or allowing any Netlify build/deploy.
