-- ZaPZaP: apply only to a NEW, dedicated Supabase project.
-- Existing "The Good Side" project remains untouched.
create extension if not exists pgcrypto;

create table if not exists public.zap_workspaces (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references auth.users(id) on delete cascade,
 name text not null check (length(name) between 1 and 150),
 industry text not null default 'Other',
 description text not null default '',
 products text not null default '',
 hours text not null default '',
 created_at timestamptz not null default now()
);
create table if not exists public.zap_agents (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.zap_workspaces(id) on delete cascade,
 name text not null default 'Sophia',
 tone text not null default 'Friendly & professional',
 goal_flags text[] not null default array['Answer FAQs','Capture leads'],
 busy_message text not null default '',
 provider text not null default 'ollama' check (provider in ('ollama','openai')),
 created_at timestamptz not null default now()
);
create table if not exists public.zap_leads (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.zap_workspaces(id) on delete cascade,
 name text not null,
 phone text not null default '',
 interest text not null default '',
 status text not null default 'New' check (status in ('New','Warm','Hot','Won','Lost')),
 created_at timestamptz not null default now()
);
create table if not exists public.zap_conversations (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.zap_workspaces(id) on delete cascade,
 contact_name text not null default '',
 contact_phone text not null default '',
 channel text not null default 'whatsapp',
 created_at timestamptz not null default now()
);
create table if not exists public.zap_messages (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null references public.zap_workspaces(id) on delete cascade,
 conversation_id uuid not null references public.zap_conversations(id) on delete cascade,
 direction text not null check (direction in ('inbound','outbound')),
 body text not null,
 created_at timestamptz not null default now()
);
create table if not exists public.zap_subscriptions (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null unique references public.zap_workspaces(id) on delete cascade,
 provider text not null default 'paypal',
 external_subscription_id text unique,
 plan text not null default 'trial',
 status text not null default 'pending',
 updated_at timestamptz not null default now()
);
create index if not exists zap_leads_workspace_idx on public.zap_leads(workspace_id,created_at desc);
create index if not exists zap_messages_conversation_idx on public.zap_messages(conversation_id,created_at desc);

alter table public.zap_workspaces enable row level security;
alter table public.zap_agents enable row level security;
alter table public.zap_leads enable row level security;
alter table public.zap_conversations enable row level security;
alter table public.zap_messages enable row level security;
alter table public.zap_subscriptions enable row level security;

create policy "owner controls workspaces" on public.zap_workspaces for all to authenticated using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy "owner controls agents" on public.zap_agents for all to authenticated
 using (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
create policy "owner controls leads" on public.zap_leads for all to authenticated
 using (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
create policy "owner controls conversations" on public.zap_conversations for all to authenticated
 using (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
create policy "owner controls messages" on public.zap_messages for all to authenticated
 using (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())))
 with check (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
-- Only the backend/service role may modify subscriptions after verifying PayPal webhook signatures.
create policy "owner views subscription" on public.zap_subscriptions for select to authenticated
 using (exists(select 1 from public.zap_workspaces w where w.id=workspace_id and w.owner_id=(select auth.uid())));
-- A message must refer to a conversation in the same workspace.
create or replace function public.zap_message_workspace_guard() returns trigger language plpgsql
set search_path=public as $$
begin
 if not exists (select 1 from public.zap_conversations where id=new.conversation_id and workspace_id=new.workspace_id) then
  raise exception 'Conversation and workspace mismatch';
 end if;
 return new;
end $$;
create trigger zap_messages_workspace_guard before insert or update on public.zap_messages
 for each row execute function public.zap_message_workspace_guard();
