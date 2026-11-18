# Local account testing (Windows 11)

The default landing page now opens **Log in** for existing users. Local sign-in uses your REAL Supabase account, not a fake/demo login. It is not possible to log in to the same account offline with no Supabase connection.

## One-time local environment setup

Create a file named `.env.local` at the root of your LOCAL ZaPZaP checkout, containing:

```dotenv
NEXUS_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXUS_SUPABASE_PUBLISHABLE_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
NEXUS_SUPABASE_SECRET_KEY=YOUR_SUPABASE_SERVER_SECRET_KEY
```

Use only keys belonging to your own NexusSales Supabase project. You can obtain these through your private project dashboard. The publishable key is intentionally exposed to the browser; the secret key is **server-only** and must NEVER be posted, photographed, committed, or shared. The entire `.env.local` file is gitignored. Never give the secret key to a chatbot or in a GitHub issue. For safer tests use separate staging credentials.

If you deliberately use your existing PRODUCTION Supabase project to test your existing account locally, **you are using live account data** and any changes you save can affect production records. Prefer a staging clone and separate test account for edit/save workflows; do not run the unapplied SQL on production.

## Start the complete local backend
```powershell
git switch main
git pull --ff-only origin main
npm run test:ci
npm start
```
Open `http://127.0.0.1:8788/business.html`. The local Node server now maps `/api/public-config`, `/.netlify/functions/owner-workspace`, `/store-chat`, and `/store-inquiry` to the actual backend modules. It does not run PayPal payments from the local dev server. The user signs in with their EXISTING NexusSales email/password and the complimentary status is read from the authenticated server-side account entitlement.

If the page still says the connection is missing, open `http://127.0.0.1:8788/api/public-config`. It should return `configured:true` (and only a public key). Do not include or expose the server secret. Restart `npm start` after editing `.env.local`.

## Release gate
The custom Personal AI schema is still NOT APPLIED, so the new builder should show a migration-pending warning and disable saving until staging validation and a separately approved migration. Normal existing sign-in and workspace access can still work.
