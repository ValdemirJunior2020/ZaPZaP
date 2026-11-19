-- NexusSales AI operational profile, additive and repeatable.
-- Apply through Supabase SQL Editor only after reviewing the change.
-- Does NOT alter billing, accounts, existing appointments, or legacy store columns.
create table if not exists public.nx_business_profiles (
 store_id uuid primary key references public.nx_stores(id) on delete cascade,
 address text not null default '',
 city text not null default '',
 region text not null default '',
 country text not null default '',
 phone text not null default '',
 website text not null default '',
 online_only boolean not null default false,
 address_public boolean not null default false,
 timezone text not null default 'America/New_York',
 categories jsonb not null default '[]'::jsonb,
 weekly_hours jsonb not null default '{"mon":[],"tue":[],"wed":[],"thu":[],"fri":[],"sat":[],"sun":[]}'::jsonb,
 closed_dates jsonb not null default '[]'::jsonb,
 booking_duration_minutes integer not null default 30 check (booking_duration_minutes between 15 and 120),
 booking_notice_hours integer not null default 2 check (booking_notice_hours between 0 and 168),
 updated_at timestamptz not null default now(),
 constraint nx_business_profile_categories_array check (jsonb_typeof(categories) = 'array'),
 constraint nx_business_profile_hours_object check (jsonb_typeof(weekly_hours) = 'object'),
 constraint nx_business_profile_closed_array check (jsonb_typeof(closed_dates) = 'array')
);
alter table public.nx_business_profiles enable row level security;
-- All reads/writes in this upgrade pass through existing authenticated owner backend.
-- RLS intentionally grants no direct anon/auth browser access to the profile.
revoke all on public.nx_business_profiles from anon, authenticated;
-- Preferred interface language for each business: United States, Spain, Brazil.
-- This setting is saved on the server and survives sign-out / sign-in on any device.
alter table public.nx_business_profiles
 add column if not exists interface_language text not null default 'en'
 check (interface_language in ('en','es','pt'));
