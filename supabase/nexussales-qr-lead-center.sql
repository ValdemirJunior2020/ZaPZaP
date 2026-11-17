-- NexusSales AI: QR-to-lead tracking, private conversation logs, capped public chat.
-- Applied to existing NexusSales Supabase on Nov 17, 2026. Safe to re-run.
alter table public.nx_stores
 add column if not exists chat_max_messages integer not null default 10,
 add column if not exists chat_max_minutes integer not null default 10,
 add column if not exists appointments_enabled boolean not null default true;
alter table public.nx_stores drop constraint if exists nx_stores_chat_limits_chk;
alter table public.nx_stores add constraint nx_stores_chat_limits_chk
 check(chat_max_messages between 5 and 30 and chat_max_minutes between 5 and 30);
create table if not exists public.nx_qr_sources(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 code text not null unique default('qr_'||encode(gen_random_bytes(12),'hex')),
 label text not null check(length(label) between 2 and 80),
 offering_id uuid references public.nx_offerings(id) on delete set null,
 enabled boolean not null default true,
 scan_count bigint not null default 0,
 created_at timestamptz not null default now()
);
alter table public.nx_qr_sources add column if not exists scan_count bigint not null default 0;
create index if not exists nx_qr_sources_store_idx on public.nx_qr_sources(store_id,created_at desc);
create table if not exists public.nx_chat_sessions(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 source_id uuid references public.nx_qr_sources(id) on delete set null,
 started_at timestamptz not null default now(),
 expires_at timestamptz not null,
 message_count integer not null default 0 check(message_count >= 0),
 closed_at timestamptz
);
create index if not exists nx_chat_sessions_store_idx on public.nx_chat_sessions(store_id,started_at desc);
create table if not exists public.nx_chat_messages(
 id bigint generated always as identity primary key,
 session_id uuid not null references public.nx_chat_sessions(id) on delete cascade,
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 role text not null check(role in ('user','assistant')),
 content text not null check(length(content) between 1 and 2500),
 created_at timestamptz not null default now()
);
create index if not exists nx_chat_messages_session_idx on public.nx_chat_messages(session_id,id desc);
alter table public.nx_leads add column if not exists session_id uuid references public.nx_chat_sessions(id) on delete set null;
alter table public.nx_leads add column if not exists source_id uuid references public.nx_qr_sources(id) on delete set null;
alter table public.nx_leads add column if not exists request_type text not null default 'information';
alter table public.nx_leads add column if not exists preferred_time text not null default '';
alter table public.nx_leads add column if not exists updated_at timestamptz not null default now();
create index if not exists nx_leads_session_idx on public.nx_leads(store_id,session_id);
alter table public.nx_qr_sources enable row level security;
alter table public.nx_chat_sessions enable row level security;
alter table public.nx_chat_messages enable row level security;
revoke all on public.nx_qr_sources,public.nx_chat_sessions,public.nx_chat_messages from public,anon,authenticated;
grant all on public.nx_qr_sources,public.nx_chat_sessions,public.nx_chat_messages to service_role;
grant usage,select on sequence public.nx_chat_messages_id_seq to service_role;
CREATE OR REPLACE FUNCTION public.nx_claim_chat_message(p_store_id uuid, p_session_id uuid, p_source_code text, p_limit integer, p_minutes integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_session public.nx_chat_sessions%rowtype; v_source uuid;
begin
 if not exists(select 1 from public.nx_stores where id=p_store_id and published=true) then
  return jsonb_build_object('allowed',false,'reason','not_published');
 end if;
 if p_limit not between 5 and 30 or p_minutes not between 5 and 30 then
  return jsonb_build_object('allowed',false,'reason','invalid_limits');
 end if;
 if p_session_id is null then
  if nullif(p_source_code,'') is not null then
   select id into v_source from public.nx_qr_sources where code=p_source_code and store_id=p_store_id and enabled=true;
  end if;
  insert into public.nx_chat_sessions(store_id,source_id,expires_at,message_count)
  values(p_store_id,v_source,now() + make_interval(mins=>p_minutes),1)
  returning * into v_session;
 else
  update public.nx_chat_sessions set message_count=message_count+1,
   closed_at=case when message_count+1 >= p_limit then now() else closed_at end
  where id=p_session_id and store_id=p_store_id and closed_at is null
   and expires_at>now() and message_count<p_limit
  returning * into v_session;
  if not found then return jsonb_build_object('allowed',false,'reason','limit_reached');end if;
 end if;
 if v_session.message_count>=p_limit then
  update public.nx_chat_sessions set closed_at=now() where id=v_session.id and closed_at is null;
 end if;
 return jsonb_build_object('allowed',true,'sessionId',v_session.id,
  'used',v_session.message_count,'max',p_limit,'remaining',greatest(0,p_limit-v_session.message_count),
  'expiresAt',v_session.expires_at,'sourceId',v_session.source_id);
end $function$

revoke all on function public.nx_claim_chat_message(uuid,uuid,text,integer,integer) from public,anon,authenticated;
grant execute on function public.nx_claim_chat_message(uuid,uuid,text,integer,integer) to service_role;
CREATE OR REPLACE FUNCTION public.nx_track_qr_scan(p_store_id uuid, p_code text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 update public.nx_qr_sources set scan_count=scan_count+1
 where store_id=p_store_id and code=p_code and enabled=true;
 return found;
end $function$

revoke all on function public.nx_track_qr_scan(uuid,text) from public,anon,authenticated;
grant execute on function public.nx_track_qr_scan(uuid,text) to service_role;
