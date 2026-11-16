-- NexusSales runtime quotas, run on dedicated NexusSales database after SmartStore and billing.
-- One atomic daily quota per store to control trial costs and concurrent requests.
create table if not exists public.nx_chat_daily_usage(
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 day date not null default (now() at time zone 'utc')::date,
 used integer not null default 0 check(used >= 0),
 primary key(store_id, day)
);
alter table public.nx_chat_daily_usage enable row level security;
revoke all on public.nx_chat_daily_usage from public,anon,authenticated;

create or replace function public.nx_consume_chat_quota(p_store_id uuid, p_cap integer)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare quota integer;
begin
 if p_cap < 1 or p_cap > 10000 then return false; end if;
 if not exists(select 1 from public.nx_stores where id=p_store_id and published=true)
 then return false; end if;
 insert into public.nx_chat_daily_usage(store_id,day,used)
 values(p_store_id,(now() at time zone 'utc')::date,1)
 on conflict(store_id,day)
 do update set used=public.nx_chat_daily_usage.used+1
 where public.nx_chat_daily_usage.used<p_cap
 returning used into quota;
 return quota is not null;
end;
$$;
revoke all on function public.nx_consume_chat_quota(uuid,integer) from PUBLIC,anon,authenticated;
grant execute on function public.nx_consume_chat_quota(uuid,integer) to service_role;
