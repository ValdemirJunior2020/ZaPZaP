# NexusSales SmartStore — implementation and next release

## Shipped (demo)
- Universal My Store management: products, services, packages, consultations, quotes, images from URLs or local small uploads, pricing, status.
- Editable business hero image, headline, business type and slug.
- Optional fictional templates for marketing services, mechanics and HVAC, loaded only with confirmation.
- Browser-local storefront preview at `/store.html?s=slug`, QR and example widget code.
- Local Ollama chat includes owner-entered catalog rows in its context, with instructions never to invent prices or unavailable inventory.

## Important limitations
- Preview data is saved only in the current browser. QR/share URL is **not yet a reliable cross-device customer catalog**.
- Role selector is a simulation, not authentication. Do not load personal customer data or paywall-access-only assets.
- Real AI is available on the owner's localhost with Ollama; public Netlify storefront has no hosted AI.
- AI-generated pictures and upload-to-cloud storage are not connected.
- Billing, appointments and human callback delivery are not production services.
- Pricing in example templates is fictional and must be replaced.

## Production sequence
1. Create a dedicated Supabase project for NexusSales, separate from The Good Side.
2. Review and apply `supabase/nexussales-smartstore.sql` to that project; run Supabase advisors. Configure verified email/password login.
3. Wire owner CRUD to `nx_stores`/`nx_offerings` with Supabase Auth and RLS; prohibit using the front-end demo role to authorize anything.
4. Use only a project publishable key in the browser. Backend secrets must remain server-side.
5. Replace `store.html` localStorage reads with published public store queries; only then enable externally shareable live SmartLinks and QR.
6. Host a rate-limited AI gateway and secure lead-intake endpoint, using per-business configuration from the database.
7. Connect persistent leads, notification/consent, billing webhook verification, and usage quotas before accepting paid customers.

## Examples
- Marketing: recurring social media management, brand strategy consultation, package quotes.
- Mechanic: diagnostics, brake inspection, scheduled services.
- HVAC/A/C: repairs, maintenance plans, installation estimates.
- Any business: physical products, services, custom quotes, and appointment requests.
