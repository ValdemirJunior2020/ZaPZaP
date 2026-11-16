-- NexusSales billing, for a DEDICATED NexusSales Supabase project only.
-- Run after nexussales-smartstore.sql. Do NOT run against The Good Side.
-- A 48-hour free trial begins at account creation, not at the first browser visit.
create table if not exists public.nx_entitlements (
  user_id uuid primary key references auth.users(id) on delete cascade,
  trial_started_at timestamptz not null default now(),
  subscription_status text not null default 'TRIAL'
    check (subscription_status in ('TRIAL','PENDING','ACTIVE','SUSPENDED','CANCELLED','EXPIRED')),
  paypal_subscription_id text unique,
  paypal_plan_id text,
  last_payment_at timestamptz,
  updated_at timestamptz not null default now()
);
create index if not exists nx_entitlements_paypal_idx on public.nx_entitlements (paypal_subscription_id)
 where paypal_subscription_id is not null;
alter table public.nx_entitlements enable row level security;
-- User can only READ their entitlement. Client cannot create, extend, or edit it.
revoke all on table public.nx_entitlements from anon,authenticated;
grant select on table public.nx_entitlements to authenticated;
create policy "owner reads own entitlement" on public.nx_entitlements
 for select to authenticated using (user_id=(select auth.uid()));

-- Create a trial at AUTH SIGNUP, not on first login. Trigger function is in
-- an unexposed schema; no public EXECUTE permission.
create schema if not exists nx_private;
create or replace function nx_private.open_trial_on_signup()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.nx_entitlements(user_id,trial_started_at)
  values (new.id,new.created_at)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke all on function nx_private.open_trial_on_signup() from public,anon,authenticated;
drop trigger if exists nx_open_trial_after_signup on auth.users;
create trigger nx_open_trial_after_signup after insert on auth.users
for each row execute function nx_private.open_trial_on_signup();

-- If setup happens after test users exist, use the ORIGINAL signup time.
insert into public.nx_entitlements(user_id,trial_started_at)
select id,created_at from auth.users on conflict(user_id) do nothing;

-- Important: all protected actions / public AI calls must check nx_entitlements
-- server-side. Browser role flags and UI paywalls are never authorization.
-- Subscription status becomes ACTIVE only after the backend checks PayPal.
