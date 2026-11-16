-- NexusSales SmartStore — NEW dedicated Supabase project only.
-- Do not execute against The Good Side.
create extension if not exists pgcrypto;
create table if not exists public.nx_stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug)<=50),
  name text not null check (char_length(name) between 1 and 150),
  industry text not null default 'Other',
  description text not null default '',
  headline text not null default '',
  store_image_url text check (store_image_url is null or (char_length(store_image_url)<=2048 and store_image_url ~ '^https://')),
  store_image_prompt text,
  logo_url text check (logo_url is null or (char_length(logo_url)<=2048 and logo_url ~ '^https://')),
  image_source text not null default 'url' check (image_source in ('url','upload','ai')),
  color text not null default '#06aa77',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.nx_offerings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.nx_stores(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 130),
  type text not null check (type in ('Product','Service','Package','Consultation','Custom quote')),
  description text not null default '',
  price_label text not null default '',
  status text not null default 'Contact for availability',
  image_url text check (image_url is null or (char_length(image_url)<=2048 and image_url ~ '^https://')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists nx_offerings_store_idx on public.nx_offerings(store_id,sort_order);
create table if not exists public.nx_leads (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.nx_stores(id) on delete cascade,
  customer_name text not null default '',
  customer_phone text not null default '',
  customer_email text not null default '',
  interest text not null default '',
  status text not null default 'New',
  created_at timestamptz not null default now()
);
alter table public.nx_stores enable row level security;
alter table public.nx_offerings enable row level security;
alter table public.nx_leads enable row level security;
create policy "owners manage stores" on public.nx_stores for all to authenticated
 using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "public sees published stores" on public.nx_stores for select to anon
 using (published = true);
create policy "owners manage offerings" on public.nx_offerings for all to authenticated
 using (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
create policy "public sees published offerings" on public.nx_offerings for select to anon
 using (exists(select 1 from public.nx_stores s where s.id=store_id and s.published=true));
create policy "owners manage leads" on public.nx_leads for all to authenticated
 using (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.nx_stores s where s.id=store_id and s.owner_id=(select auth.uid())));
-- In production, the public customer-chat endpoint must validate requests/rate limits
-- and write leads through a trusted server-side function; do NOT grant anon write access.
-- Implement role enforcement on the backend, never on localStorage or user_metadata.
