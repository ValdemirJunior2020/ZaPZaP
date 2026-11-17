# NexusSales AI Supabase signup email branding
This is a ready-to-paste Supabase **Confirm signup** email template. It has NOT been applied to the hosted Auth configuration automatically.
1. Open https://supabase.com/dashboard/project/upjlglwojmdjfjtdoxqg/auth/templates and choose **Confirm signup**.
2. Set subject to **Confirm your NexusSales AI account** and paste the HTML from `supabase/templates/confirmation.html`; save and send yourself a test signup.
Supabase supports Go Template variables `{{ .ConfirmationURL }}` and `{{ .Email }}`. Keep both variables exactly. Do NOT place secrets in the HTML. If the built-in SMTP sender has rate limits, configure a verified custom SMTP sender before high-volume registration.
