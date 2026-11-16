-- NexusSales public website widget, NEW DEDICATED NexusSales project ONLY.
-- Requires nexussales-smartstore.sql and nexussales-trial-paypal.sql.
-- Do not execute against The Good Side.
create table if not exists public.nx_bots (
  bot_id text primary key default ('bot_' || encode(gen_random_bytes(12), 'hex')),
  store_id uuid not null unique references public.nx_stores(id) on delete cascade,
  enabled boolean not null default false,
  greeting text not null default 'Hi! How can we help today?',
  primary_color text not null default '#06a978',
  allowed_domains text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint valid_bot_key check (bot_id ~ '^bot_[a-z0-9]{20,50}$')
);
alter table public.nx_bots enable row level security;
revoke all on public.nx_bots from anon;
grant select,insert,update,delete on public.nx_bots to authenticated;
create policy "owner manages own widget" on public.nx_bots
 for all to authenticated
 using (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
-- No public direct table read. Visitors use server endpoints which verify published status, trial,
-- subscriptions, quotas and enabled state. The bot ID is public; it is NOT an API secret.

create table if not exists nx_private.widget_daily_usage (
 bot_id text not null references public.nx_bots(bot_id) on delete cascade,
 usage_date date not null default (now() at time zone 'utc')::date,
 hits integer not null default 0 check (hits >= 0),
 primary key (bot_id,usage_date)
);
revoke all on nx_private.widget_daily_usage from public,anon,authenticated;
-- An atomic cap prevents parallel callers from bypassing the per-bot daily request cap.
create or replace function nx_private.consume_widget_quota(p_bot text,p_daily_cap integer)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare allowed integer;
begin
 if p_daily_cap < 1 or p_daily_cap > 1000 then return false; end if;
 insert into nx_private.widget_daily_usage(bot_id,usage_date,hits)
 values (p_bot,(now() at time zone 'utc')::date,1)
 on conflict (bot_id,usage_date)
 do update set hits=nx_private.widget_daily_usage.hits+1
 where nx_private.widget_daily_usage.hits < p_daily_cap
 returning hits into allowed;
 return allowed is not null;
exception when foreign_key_violation then return false;
end;
$$;
revoke all on function nx_private.consume_widget_quota(text,integer) from public,anon,authenticated;
grant execute on function nx_private.consume_widget_quota(text,integer) to service_role;
-- Production deployments need private schema RPC access via direct Postgres connection
-- or a vetted public-schema invoker function restricted to service_role (see setup).
-- Do not expose this function to anon/authenticated.
