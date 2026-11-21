# Nexus AI: free public APIs registry (LOCAL DEVELOPMENT ONLY)

Discovery catalog: https://github.com/public-apis/public-apis

- **Frankfurter**: currency exchange rates, no API key, commercially usable public API; rates are indicative and not real-time transaction prices. Enabled locally by default. Official docs: https://frankfurter.dev/
- **Nager.Date**: public holiday lookup, no key; optional and **OFF by default** pending review of commercial service availability and quota terms. Official docs: https://nagerholidays.com/api
- **Google Calendar**: OAuth per owner is a separate integration requiring owner-provided Google Cloud OAuth client ID/secret, registered callback, secure token key, and database schema. The Calendar API has no additional charge for standard use under quota; Google announced planned charges for exceeding quotas later in 2026. Official docs: https://developers.google.com/workspace/calendar/api/guides/quota
- **Open-Meteo**: excluded from the hosted commercial Nexus SaaS because the free hosted API is restricted to non-commercial use. https://open-meteo.com/en/pricing

Server-side API: POST /.netlify/functions/nexus-integrations, authenticated account + same origin only; actions currency and holidays. GET returns enabled integrations. Never provide arbitrary URL fetch or dynamic host selection.

Flags: NEXUS_FX_ENABLED=false disables currency; NEXUS_HOLIDAYS_ENABLED=true opts into holidays. Timeout 4.5 seconds, in-memory caches 10 minutes / 24 hours. These caches are local to a process, not globally synchronized. API errors are handled gracefully.

No billing integrations, production changes, or paid APIs. No external service is called during unit tests (provider HTTP calls are mocked).
