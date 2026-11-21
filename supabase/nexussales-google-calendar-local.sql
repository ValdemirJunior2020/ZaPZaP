-- LOCAL REVIEW ONLY. DO NOT APPLY TO PRODUCTION without explicit approval.
-- The secret key and OAuth tokens must not be stored in frontend files.
create table if not exists public.nx_google_calendar_connections (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 store_id uuid not null unique references public.nx_stores(id) on delete cascade,
 google_email text not null,
 access_cipher text not null,
 refresh_cipher text not null,
 expires_at timestamptz not null,
 state text not null default 'connected' check(state in ('connected','reconnect_required')),
 last_sync_at timestamptz,
 last_sync_status text not null default 'not_synced',
 updated_at timestamptz not null default now(),
 constraint nx_gc_email_length check(char_length(google_email)<251)
);
create index if not exists nx_google_calendar_store_lookup on public.nx_google_calendar_connections(store_id);
alter table public.nx_google_calendar_connections enable row level security;
revoke all on public.nx_google_calendar_connections from public,anon,authenticated;
grant select,insert,update,delete on public.nx_google_calendar_connections to service_role;
-- Note: tenant authorization is enforced by the server's verified auth.user + store owner checks.
