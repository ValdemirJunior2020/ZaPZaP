-- NexusSales: connect existing calendar tables to Leads & Chats.
-- Already applied to the connected NexusSales Supabase project; not for other DBs without review.
create extension if not exists btree_gist with schema extensions;
alter table public.nx_appointments alter column staff_id drop not null;
alter table public.nx_appointments alter column service_id drop not null;
alter table public.nx_appointments add column if not exists employee_id uuid references public.nx_employees(id) on delete set null;
create index if not exists nx_appointments_store_calendar on public.nx_appointments(store_id,start_at);
create unique index if not exists nx_appointments_unique_store_lead on public.nx_appointments(store_id,lead_id) where lead_id is not null;
alter table public.nx_appointments enable row level security;
revoke all on public.nx_appointments from public,anon,authenticated;
grant select,insert,update,delete on public.nx_appointments to service_role;
create or replace function public.nx_appt_tenant_check() returns trigger language plpgsql set search_path=public as $$
begin
 if new.lead_id is not null and not exists(select 1 from public.nx_leads l where l.id=new.lead_id and l.store_id=new.store_id) then raise exception 'Lead does not belong to store'; end if;
 if new.employee_id is not null and not exists(select 1 from public.nx_employees e where e.id=new.employee_id and e.store_id=new.store_id and not e.archived) then raise exception 'Employee does not belong to store'; end if;
 if new.staff_id is not null and not exists(select 1 from public.nx_calendar_staff s where s.id=new.staff_id and s.store_id=new.store_id) then raise exception 'Calendar staff not in store'; end if;
 if new.service_id is not null and not exists(select 1 from public.nx_calendar_services s where s.id=new.service_id and s.store_id=new.store_id) then raise exception 'Calendar service not in store'; end if;
 if new.end_at > new.start_at + interval '8 hours' then raise exception 'Appointment too long'; end if;
 return new;
end $$;
drop trigger if exists nx_appt_tenant_check on public.nx_appointments;
create trigger nx_appt_tenant_check before insert or update of lead_id,employee_id,store_id,staff_id,service_id,end_at,start_at
on public.nx_appointments for each row execute function public.nx_appt_tenant_check();
alter table public.nx_appointments drop constraint if exists nx_appt_employee_conflict;
alter table public.nx_appointments add constraint nx_appt_employee_conflict
exclude using gist(store_id with =, employee_id with =, tstzrange(start_at,end_at,'[)') with &&)
where (status in ('requested','confirmed') and employee_id is not null);
alter table public.nx_appointments drop constraint if exists nx_appt_unassigned_conflict;
alter table public.nx_appointments add constraint nx_appt_unassigned_conflict
exclude using gist(store_id with =, tstzrange(start_at,end_at,'[)') with &&)
where (status in ('requested','confirmed') and employee_id is null and staff_id is null);
