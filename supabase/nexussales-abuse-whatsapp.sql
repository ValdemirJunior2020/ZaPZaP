-- Dedicated NexusSales Supabase ONLY. Apply after nexussales-runtime.sql.
-- Cross-instance abusive-client budget. Only the server may invoke these functions.
create table if not exists public.nx_abuse_windows (
  scope text not null,
  fingerprint text not null,
  bucket bigint not null,
  hits integer not null default 0 check(hits>=0),
  primary key(scope,fingerprint,bucket)
);
alter table public.nx_abuse_windows enable row level security;
revoke all on public.nx_abuse_windows from PUBLIC,anon,authenticated;
create or replace function public.nx_consume_abuse_budget(
  p_scope text,p_fingerprint text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path=''
as $$
declare total integer;
begin
  if p_scope !~ '^[a-z_]{2,40}$' or p_fingerprint !~ '^[a-f0-9]{64}$'
     or p_limit not between 1 and 1000 or p_window_seconds not between 10 and 86400 then return false; end if;
  insert into public.nx_abuse_windows(scope,fingerprint,bucket,hits)
  values(p_scope,p_fingerprint,floor(extract(epoch from now())/p_window_seconds)::bigint,1)
  on conflict(scope,fingerprint,bucket)
  do update set hits=public.nx_abuse_windows.hits+1
  where public.nx_abuse_windows.hits<p_limit
  returning hits into total;
  return total is not null;
end;$$;
revoke all on function public.nx_consume_abuse_budget(text,text,integer,integer) from PUBLIC,anon,authenticated;
grant execute on function public.nx_consume_abuse_budget(text,text,integer,integer) to service_role;

create table if not exists public.nx_whatsapp_channels (
  phone_number_id text primary key,
  store_id uuid not null references public.nx_stores(id) on delete cascade,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_store_whatsapp unique(store_id)
);
alter table public.nx_whatsapp_channels enable row level security;
revoke all on public.nx_whatsapp_channels from PUBLIC,anon,authenticated;

create table if not exists public.nx_whatsapp_messages (
  message_id text primary key,
  store_id uuid not null references public.nx_stores(id) on delete cascade,
  created_at timestamptz not null default now(),
  status text not null default 'processing' check(status in ('processing','sent','failed'))
);
alter table public.nx_whatsapp_messages enable row level security;
revoke all on public.nx_whatsapp_messages from PUBLIC,anon,authenticated;
create or replace function public.nx_claim_whatsapp_message(p_message_id text,p_store_id uuid)
returns boolean language plpgsql security definer set search_path=''
as $$
declare claimed text;
begin
 if length(p_message_id) not between 5 and 200 then return false; end if;
 insert into public.nx_whatsapp_messages(message_id,store_id)
 values(p_message_id,p_store_id) on conflict do nothing returning message_id into claimed;
 return claimed is not null;
end;$$;
revoke all on function public.nx_claim_whatsapp_message(text,uuid) from PUBLIC,anon,authenticated;
grant execute on function public.nx_claim_whatsapp_message(text,uuid) to service_role;
-- Periodic retention cleanup is required for nx_abuse_windows and nx_whatsapp_messages.
