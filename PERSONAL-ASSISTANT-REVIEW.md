# Build Your Personal Assistant — REVIEW BRANCH

This branch contains the NexusSales Personal Assistant builder. **Do not merge into main or deploy to Production until verified and approved.** The SQL migration is intentionally not applied.

## Features
- Sidebar: **Build Your Personal Assistant**, available to owners with a saved business profile.
- User-selected assistant name, permanent public handle, five general personalities, optional greeting and public background, enabled switch and session limits.
- Special **Faithful Encourager** for the lifetime complimentary owner only. Others cannot select it in the API or database.
- Public mobile-first page at `/assistant/<handle>`; WhatsApp sharing is only a normal link, not a Meta/WhatsApp integration.
- Server-bound transcript, message limits and voluntary contact requests linked to the owner's Lead Center.

## Pull and inspect locally
```powershell
cd "$env:USERPROFILE\Desktop\ZaPZaP-local"
git fetch origin feature/build-personal-assistant-review-20261118
git switch feature/build-personal-assistant-review-20261118
npm install
npm run test:ci
```
If the repository is not on your computer, clone it first. To view the static web app:
```powershell
npm start
```
Then visit `http://localhost:8788/business.html`. Some API features require environment variables and a **separate test Supabase project**, not the production database.

## Must pass before release
1. `npm run test:ci`, plus web bundling and cross-browser layout checks.
2. Apply the SQL **only to a nonproduction Supabase test database** and run isolation, owner auth, unique-handle, duplicate visitor, rate-limit and lead-history integration tests.
3. Verify existing SmartStore, QR, business chat, PayPal and current personal Hope route remain functional.
4. Verify mobile first screens, chatbot fallback when Ollama offline, disclosure/consent and privacy policy.
5. Only after explicit owner approval plan a production DB migration and a single Vercel Production deployment.

## Unapplied SQL
`supabase/nexussales-personal-assistant-REVIEW-ONLY.sql` modifies public tables and adds tenant-safe RPC. It is a design artifact until reviewed.

## Important
Push was authorized, **production deployment was not**. GitHub branch: `feature/build-personal-assistant-review-20261118`. Any Vercel preview that the project's Git integration might start is not a production release and has not been independently verified here.
