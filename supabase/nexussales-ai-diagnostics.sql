-- Additive, privacy-minimal operational diagnostic table for NexusSales owner.
-- No user prompt, transcript, IP, token, raw exception, or credentials are stored.
create table if not exists public.nx_ai_error_logs(
 id uuid primary key,
 owner_id uuid not null references auth.users(id) on delete cascade,
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 created_at timestamptz not null default now(),
 stage text not null check(stage in ('rate_limit','assistant_lookup','store_lookup','daily_quota','session_claim','history','message_save','ai_gateway','reply_save','other')),
 error_code text not null check(length(error_code) between 3 and 64),
 elapsed_ms integer not null check(elapsed_ms between 0 and 120000)
);
create index if not exists nx_ai_error_logs_owner_recent on public.nx_ai_error_logs(owner_id,store_id,created_at desc);
alter table public.nx_ai_error_logs enable row level security;
revoke all on table public.nx_ai_error_logs from public,anon,authenticated;
grant select,insert on table public.nx_ai_error_logs to service_role;
