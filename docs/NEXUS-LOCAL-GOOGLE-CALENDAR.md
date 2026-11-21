# Google Calendar OAuth — LOCAL DEVELOPMENT BRANCH ONLY

Branch: feat/local-calendar-free-apis-20261120
Nexus Google Calendar integration lives in Leads & Chats, not a new sidebar item. It uses official Google OAuth web-server authorization and connects each business owner to their own Google account. The account's Google email, connection status, upcoming events, Connect, Disconnect and manual Sync options are shown there.

## Manual one-time Google Cloud setup
1. Create a free Google Cloud project, enable the Google Calendar API, and configure OAuth consent. Create a Web Application OAuth client.
2. Add the authorized redirect URI exactly: `http://127.0.0.1:8788/.netlify/functions/google-calendar-callback`. Use an account included under OAuth test users if Google consent is in Testing mode.
3. Apply `supabase/nexussales-google-calendar-local.sql` **only to an isolated development Supabase database**, never the existing production database without explicit approval.
4. Store secrets in local, gitignored `.env.local` on the user's Home PC:
```ini
NEXUS_GOOGLE_CLIENT_ID=<Google web OAuth client ID>
NEXUS_GOOGLE_CLIENT_SECRET=<Google secret>
NEXUS_GOOGLE_REDIRECT_URI=http://127.0.0.1:8788/.netlify/functions/google-calendar-callback
NEXUS_GOOGLE_TOKEN_ENCRYPTION_KEY=<32 random bytes in hex, 64 hex chars>
NEXUS_GOOGLE_OAUTH_STATE_SECRET=<a different random 32+ character secret>
```
Generate 32-byte secrets in PowerShell with `[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))` twice.
5. `npm run test:ci`, `npm start`, then open `http://127.0.0.1:8788` and sign in to a development business account. Use Leads & Chats > Calendar > Connect to Google Calendar.

The owner can see Google appointments and manually sync confirmed Nexus appointments, updates, and cancellations. The Google API is checked for overlapping calendar events before sync. Event IDs are deterministic, so retries do not create duplicate Google entries. Google API failures keep the local record and display a warning; they must never be described as successful Google sync. Disconnect removes stored encrypted tokens; previously created Google events remain on Google.

Security: tokens stay on the backend; AES-256-GCM encryption at rest, OAuth state HMAC and HttpOnly callback cookie, tenant owner IDs verified against authenticated Nexus login, and all Google operations scoped to the owner's store. Calendar scopes: `calendar.events`, `userinfo.email`.

Not yet complete: automatic sync for every native Nexus edit (manual sync is available), AI-controlled booking and confirmation, recurring free/busy-aware slot generation, company holiday/working-hour enforcement, automatic notifications, production OAuth verification, and end-to-end real Google integration testing. No claim these features work yet. Customer-facing use needs live tests and owner approval.

Google Calendar standard usage is free subject to quotas. Google has announced planned over-quota charges later in 2026; review https://developers.google.com/workspace/calendar/api/guides/quota and consent requirements. Never commit credentials or deploy without explicit approval.
