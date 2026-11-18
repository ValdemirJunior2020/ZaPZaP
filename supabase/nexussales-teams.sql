-- Additive: no PayPal changes. Never apply against a different project.
create table if not exists public.nx_employees(id uuid primary key default gen_random_uuid(),store_id uuid not null references public.nx_stores(id) on delete cascade,qr_source_id uuid unique references public.nx_qr_sources(id) on delete set null,name text not null check(length(name) between 2 and 80),role text not null default 'Vendedor',whatsapp text not null check(whatsapp ~ '^[1-9][0-9]{9,14}$'),language text not null default 'pt_BR' check(language in ('pt_BR','en_US','es_ES')),enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists nx_employees_store on public.nx_employees(store_id,created_at);
alter table public.nx_employees enable row level security;
revoke all on public.nx_employees from public,anon,authenticated;
grant select,insert,update,delete on public.nx_employees to service_role;
alter table public.nx_leads add column if not exists employee_id uuid references public.nx_employees(id) on delete set null;
create index if not exists nx_leads_employee on public.nx_leads(store_id,employee_id,created_at desc);