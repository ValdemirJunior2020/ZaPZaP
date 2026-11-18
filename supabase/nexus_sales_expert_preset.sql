-- NexusSales exclusive sales preset, additive migration (no new project or paid resource).
-- This migration only expands the existing assistant's personality choices.
alter table public.nx_personal_assistants
 drop constraint if exists nx_personal_assistants_personality_check;
alter table public.nx_personal_assistants
 add constraint nx_personal_assistants_personality_check
 check (personality in ('professional','friendly','sales','concierge','concise','faithful_encourager','nexus_sales_expert'));

create or replace function public.nx_personal_validate()
returns trigger language plpgsql security invoker set search_path=''
as $$
begin
 if new.personality in ('faithful_encourager','nexus_sales_expert')
    and new.owner_id<>'05822c44-7337-4bd6-ab0c-7df154e17e4c'::uuid
 then raise exception 'Reserved personality'; end if;
 if not exists(select 1 from public.nx_stores where id=new.store_id and owner_id=new.owner_id)
 then raise exception 'Assistant and store owner do not match'; end if;
 if tg_op='UPDATE' then
  if new.owner_id<>old.owner_id or new.store_id<>old.store_id
  then raise exception 'Assistant owner and store cannot be reassigned'; end if;
  if new.handle<>old.handle then raise exception 'Public handle is permanent'; end if;
 end if;
 return new;
end $$;
revoke execute on function public.nx_personal_validate() from public, anon, authenticated;
