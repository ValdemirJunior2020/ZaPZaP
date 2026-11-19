-- NexusSales AI: permit personal assistant public link renames without changing ownership.
-- Reviewed against live nx_personal_validate() definition on 2026-11-19.
-- Apply to Supabase only after owner approval: changes live public link behavior.
-- Existing /assistant/old links will no longer resolve after an owner chooses a new handle.
-- Database constraints retain UNIQUE(handle), format checks, and reserved personalities.
create or replace function public.nx_personal_validate()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.personality in ('faithful_encourager','nexus_sales_expert')
     and new.owner_id <> '05822c44-7337-4bd6-ab0c-7df154e17e4c'::uuid
  then raise exception 'Reserved personality'; end if;
  if not exists (
    select 1 from public.nx_stores
    where id = new.store_id and owner_id = new.owner_id
  ) then raise exception 'Assistant and store owner do not match'; end if;
  if tg_op = 'UPDATE' then
    if new.owner_id <> old.owner_id or new.store_id <> old.store_id
    then raise exception 'Assistant owner and store cannot be reassigned'; end if;
    -- The authenticated API checks ownership and globally unique handle,
    -- and the table's UNIQUE/check constraints provide defense in depth.
    -- Public handles may now change without changing the assistant UUID.
  end if;
  return new;
end $function$;
