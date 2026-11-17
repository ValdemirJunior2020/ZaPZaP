-- NexusSales AI personality presets (applied Nov 17, 2026).
-- Adds a safe, per-business style choice. The server always controls prompt wording.
alter table public.nx_stores add column if not exists ai_personality text not null default 'professional';
update public.nx_stores
set ai_personality='professional'
where ai_personality not in ('professional','friendly','sales','concierge','concise');
alter table public.nx_stores drop constraint if exists nx_stores_ai_personality_check;
alter table public.nx_stores add constraint nx_stores_ai_personality_check
check (ai_personality in ('professional','friendly','sales','concierge','concise'));
