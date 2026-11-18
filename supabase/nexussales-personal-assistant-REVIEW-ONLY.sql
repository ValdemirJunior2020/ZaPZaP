-- REVIEW ONLY. Apply only after non-production testing and owner approval.
create table if not exists public.nx_personal_assistants(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null unique references auth.users(id) on delete cascade,
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 handle text not null unique check(handle ~ '^[a-z][a-z0-9-]{2,31}$' and handle !~ '--|-$'),
 display_name text not null check(length(display_name) between 2 and 50),
 personality text not null default 'friendly' check(personality in ('professional','friendly','sales','concierge','concise','faithful_encourager')),
 greeting text not null default '' check(length(greeting)<=400),
 about text not null default '' check(length(about)<=900),
 enabled boolean not null default true,
 max_messages integer not null default 10 check(max_messages between 5 and 30),
 max_minutes integer not null default 10 check(max_minutes between 5 and 30),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.nx_chat_sessions add column if not exists personal_assistant_id uuid references public.nx_personal_assistants(id) on delete cascade;
alter table public.nx_leads add column if not exists personal_assistant_id uuid references public.nx_personal_assistants(id) on delete set null;
create index if not exists nx_pa_session_idx on public.nx_chat_sessions(personal_assistant_id,started_at desc);
alter table public.nx_personal_assistants enable row level security;
revoke all on public.nx_personal_assistants from public,anon,authenticated;
grant all on public.nx_personal_assistants to service_role;
create or replace function public.nx_claim_personal_message(p_assistant uuid,p_session uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.nx_personal_assistants%rowtype; s public.nx_chat_sessions%rowtype;
begin
 select * into a from public.nx_personal_assistants where id=p_assistant and enabled=true;
 if not found then return jsonb_build_object('allowed',false,'reason','not_enabled');end if;
 if p_session is null then
  insert into public.nx_chat_sessions(store_id,personal_assistant_id,expires_at,message_count)
  values(a.store_id,a.id,now()+make_interval(mins=>a.max_minutes),1) returning * into s;
 else
  update public.nx_chat_sessions set message_count=message_count+1,closed_at=case when message_count+1>=a.max_messages then now() else closed_at end
   where id=p_session and store_id=a.store_id and personal_assistant_id=a.id and closed_at is null
   and expires_at>now() and message_count<a.max_messages returning * into s;
  if not found then return jsonb_build_object('allowed',false,'reason','limit_reached');end if;
 end if;
 if s.message_count>=a.max_messages then update public.nx_chat_sessions set closed_at=now() where id=s.id and closed_at is null;end if;
 return jsonb_build_object('allowed',true,'sessionId',s.id,'remaining',greatest(0,a.max_messages-s.message_count),'max',a.max_messages);
end $$;
revoke all on function public.nx_claim_personal_message(uuid,uuid) from public,anon,authenticated;
grant execute on function public.nx_claim_personal_message(uuid,uuid) to service_role;
create or replace function public.nx_personal_validate() returns trigger language plpgsql set search_path='' as $$
begin
 if new.personality='faithful_encourager' and new.owner_id<>'05822c44-7337-4bd6-ab0c-7df154e17e4c'::uuid then raise exception 'Reserved personality';end if;
 if not exists(select 1 from public.nx_stores where id=new.store_id and owner_id=new.owner_id) then raise exception 'Store owner mismatch';end if;
 if tg_op='UPDATE' and new.handle<>old.handle then raise exception 'Public handle cannot be changed';end if;
 return new;
end $$;
drop trigger if exists nx_personal_validate_trigger on public.nx_personal_assistants;
create trigger nx_personal_validate_trigger before insert or update on public.nx_personal_assistants for each row execute function public.nx_personal_validate();
