# NexusSales AI — EN/PT upgrades (local test)

Feature branch: `feat/exclusive-nexus-sales-expert-20261118`. This branch is NOT merged to main.

## Windows: pull and test

From `C:\Users\Valdemir Goncalves\Downloads\ZaPZaP`:

```powershell
git switch feat/exclusive-nexus-sales-expert-20261118
git pull --ff-only origin feat/exclusive-nexus-sales-expert-20261118
npm test
npm start
```

Open http://127.0.0.1:8788/business.html and sign in with your existing owner account.

- My Store: bilingual business address/categories, IANA timezone, weekly opening hours, holidays, booking duration and minimum notice.
- Leads & Chats: Calendar / Agenda remains separate from Sales / Vendas analytics.
- SmartStore: Appointment request includes a tentative availability checker and does **not** confirm a booking.
- `START-NEXUS-LOCAL.bat` can open Ollama and the local web server. `CHECK-NEXUS-AI.ps1` and `MONITOR-NEXUS-AI.ps1` report local status.

## Database migration required

The `supabase/nexus-business-profile.sql` script must be reviewed and applied **once** through your Supabase project SQL editor before the new profile can be saved. It adds `nx_business_profiles`, enables RLS, and blocks direct public access. This is **not** applied by pulling GitHub.

Before migration, existing app functionality remains available; saving a business profile will report an error.

## Constraints

- The AI uses only business-provided knowledge, and scheduling is tentative until the owner confirms.
- Staff shift schedules are not modeled; only store opening hours and booked appointment collisions are checked.
- Sales counts reflect manually selected lead statuses, not verified purchases or revenue.
- Local Ollama and tunnel must remain online for hosted customer chat to work.
- No payment/billing changes, no paid AI model APIs, no merge or intentional Vercel deployment.
- Do not overwrite an existing locally modified `leads-calendar.js`; the branch still contains the previous calendar version. Keep your working local file.
