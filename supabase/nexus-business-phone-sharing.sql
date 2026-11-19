-- Owner-controlled AI phone disclosure for business profiles (private by default).
-- Business contact phone is already stored in nx_business_profiles.phone.
-- Only authenticated backend / service-role reads this table; public chat receives an
-- approved phone only if the owner explicitly opts in.
alter table public.nx_business_profiles
  add column if not exists phone_public boolean not null default false;
update public.nx_business_profiles set phone_public = false where phone_public is null;
comment on column public.nx_business_profiles.phone_public is
  'Owner opt-in to share business contact phone with customers through the AI. Default OFF.';
