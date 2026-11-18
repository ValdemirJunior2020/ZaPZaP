alter table public.nx_employees add column if not exists archived boolean not null default false;
create index if not exists nx_employees_active_seats on public.nx_employees(store_id) where enabled=true and archived=false;
create or replace function public.nx_employee_lead_scope_check() returns trigger language plpgsql set search_path=public as $$
begin
 if new.employee_id is not null and not exists(select 1 from public.nx_employees e where e.id=new.employee_id and e.store_id=new.store_id) then raise exception 'Employee does not belong to the same store'; end if;
 return new;
end $$;
drop trigger if exists nx_employee_lead_scope_check on public.nx_leads;
create trigger nx_employee_lead_scope_check before insert or update of employee_id,store_id on public.nx_leads for each row execute function public.nx_employee_lead_scope_check();