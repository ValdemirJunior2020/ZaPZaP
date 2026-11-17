-- NexusSales appointments: isolated per-business, staff-specific, transactional.
create extension if not exists btree_gist with schema extensions;
create table if not exists public.nx_calendar_settings(
 store_id uuid primary key references public.nx_stores(id) on delete cascade,
 timezone text not null default 'America/New_York',
 enabled boolean not null default false,
 auto_confirm boolean not null default false,
 notice_hours integer not null default 2 check(notice_hours between 0 and 168),
 horizon_days integer not null default 30 check(horizon_days between 1 and 90),
 updated_at timestamptz not null default now()
);
create table if not exists public.nx_calendar_staff(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 90),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.nx_calendar_services(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 name text not null check(char_length(name) between 2 and 100),
 duration_minutes integer not null default 30 check(duration_minutes in (15,30,45,60,90,120)),
 active boolean not null default true,
 created_at timestamptz not null default now()
);
create table if not exists public.nx_calendar_hours(
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 weekday integer not null check(weekday between 0 and 6),
 start_time time not null,
 end_time time not null,
 enabled boolean not null default false,
 primary key(store_id,weekday),
 check(start_time<end_time)
);
create table if not exists public.nx_calendar_blocks(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 staff_id uuid references public.nx_calendar_staff(id) on delete cascade,
 start_at timestamptz not null,
 end_at timestamptz not null,
 reason text not null default '',
 created_at timestamptz not null default now(),
 check(end_at>start_at)
);
create table if not exists public.nx_appointments(
 id uuid primary key default gen_random_uuid(),
 store_id uuid not null references public.nx_stores(id) on delete cascade,
 staff_id uuid not null references public.nx_calendar_staff(id) on delete cascade,
 service_id uuid not null references public.nx_calendar_services(id) on delete cascade,
 lead_id uuid references public.nx_leads(id) on delete set null,
 customer_name text not null check(char_length(customer_name) between 2 and 100),
 customer_email text not null default '',
 customer_phone text not null default '',
 notes text not null default '',
 start_at timestamptz not null,
 end_at timestamptz not null,
 status text not null default 'requested' check(status in ('requested','confirmed','cancelled','completed','no_show')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(end_at>start_at),
 constraint nx_appointments_no_double_booking exclude using gist (
  staff_id with =, tstzrange(start_at,end_at,'[)') with &&
 ) where(status in ('requested','confirmed'))
);
create index if not exists nx_appointments_store_idx on public.nx_appointments(store_id,start_at);
create index if not exists nx_cal_staff_idx on public.nx_calendar_staff(store_id);
create index if not exists nx_cal_services_idx on public.nx_calendar_services(store_id);
create index if not exists nx_cal_blocks_idx on public.nx_calendar_blocks(store_id,start_at);
do $guard$ declare t text;begin
 foreach t in array array['nx_calendar_settings','nx_calendar_staff','nx_calendar_services','nx_calendar_hours','nx_calendar_blocks','nx_appointments'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from public,anon,authenticated',t);
  execute format('grant all on public.%I to service_role',t);
 end loop;
end $guard$;

-- A shared availability validator is used for booking and rescheduling.
create or replace function public.nx_slot_is_open(p_store uuid,p_staff uuid,p_service uuid,p_start timestamptz,p_exclude uuid default null)
returns boolean language plpgsql stable set search_path='' as $$
declare cfg public.nx_calendar_settings%rowtype; dur int; local_start timestamp; h public.nx_calendar_hours%rowtype; finish timestamptz;
begin
 select * into cfg from public.nx_calendar_settings where store_id=p_store and enabled=true;
 if not found then return false;end if;
 select duration_minutes into dur from public.nx_calendar_services where id=p_service and store_id=p_store and active=true;
 if not found then return false;end if;
 if not exists(select 1 from public.nx_calendar_staff where id=p_staff and store_id=p_store and active=true) then return false;end if;
 if p_start<now()+make_interval(hours=>cfg.notice_hours) or p_start>now()+make_interval(days=>cfg.horizon_days) then return false;end if;
 local_start=p_start at time zone cfg.timezone;
 select * into h from public.nx_calendar_hours where store_id=p_store and weekday=extract(dow from local_start)::int and enabled=true;
 if not found then return false;end if;
 if local_start::time<h.start_time or (local_start+make_interval(mins=>dur))::date<>local_start::date
   or (local_start+make_interval(mins=>dur))::time>h.end_time then return false;end if;
 if extract(minute from local_start)::int%15<>0 or extract(second from local_start)<>0 then return false;end if;
 finish=p_start+make_interval(mins=>dur);
 if exists(select 1 from public.nx_calendar_blocks b where b.store_id=p_store and (b.staff_id is null or b.staff_id=p_staff)
  and tstzrange(b.start_at,b.end_at,'[)') && tstzrange(p_start,finish,'[)')) then return false;end if;
 if exists(select 1 from public.nx_appointments a where a.store_id=p_store and a.staff_id=p_staff and a.status in ('requested','confirmed')
  and (p_exclude is null or a.id<>p_exclude)
  and tstzrange(a.start_at,a.end_at,'[)') && tstzrange(p_start,finish,'[)')) then return false;end if;
 return true;
end $$;
revoke all on function public.nx_slot_is_open(uuid,uuid,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.nx_slot_is_open(uuid,uuid,uuid,timestamptz,uuid) to service_role;

-- Build 15-minute candidates in local business time. Server checks again on booking.
create or replace function public.nx_calendar_slots(p_store uuid,p_staff uuid,p_service uuid,p_day date)
returns table(start_at timestamptz) language plpgsql stable set search_path='' as $$
declare cfg public.nx_calendar_settings%rowtype; h public.nx_calendar_hours%rowtype; loc timestamp;
begin
 select * into cfg from public.nx_calendar_settings where store_id=p_store and enabled=true;
 if not found or p_day<((now() at time zone cfg.timezone)::date) or p_day>((now() at time zone cfg.timezone)::date+cfg.horizon_days) then return;end if;
 select * into h from public.nx_calendar_hours where store_id=p_store and weekday=extract(dow from p_day)::integer and enabled=true;
 if not found then return;end if;
 for loc in select generate_series((p_day+h.start_time)::timestamp,(p_day+h.end_time)::timestamp,interval '15 minutes') loop
  if (loc at time zone cfg.timezone) at time zone cfg.timezone=loc
    and public.nx_slot_is_open(p_store,p_staff,p_service,loc at time zone cfg.timezone,null) then
    start_at:=loc at time zone cfg.timezone;return next;
  end if;
 end loop;
end $$;
revoke all on function public.nx_calendar_slots(uuid,uuid,uuid,date) from public,anon,authenticated;
grant execute on function public.nx_calendar_slots(uuid,uuid,uuid,date) to service_role;

-- Transaction: create a lead AND reservation; exclusion constraint blocks racing visitors.
create or replace function public.nx_calendar_book(p_store uuid,p_staff uuid,p_service uuid,p_start timestamptz,
 p_name text,p_email text,p_phone text,p_notes text,p_session uuid default null,p_source uuid default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare d int;setting public.nx_calendar_settings%rowtype;lid uuid;aid uuid;label text;
begin
 if not exists(select 1 from public.nx_stores where id=p_store and published=true and appointments_enabled=true) then raise exception 'Scheduling unavailable';end if;
 if char_length(trim(p_name))<2 or char_length(trim(p_name))>100 or char_length(coalesce(p_notes,''))>1000 then raise exception 'Invalid request';end if;
 if (coalesce(p_email,'')='' and coalesce(p_phone,'')='') then raise exception 'Contact required';end if;
 if not public.nx_slot_is_open(p_store,p_staff,p_service,p_start,null) then raise exception 'Slot no longer available';end if;
 select duration_minutes,name into d,label from public.nx_calendar_services where id=p_service and store_id=p_store;
 select * into setting from public.nx_calendar_settings where store_id=p_store;
 if p_session is not null and not exists(select 1 from public.nx_chat_sessions where id=p_session and store_id=p_store) then raise exception 'Invalid session';end if;
 if p_source is not null and not exists(select 1 from public.nx_qr_sources where id=p_source and store_id=p_store) then raise exception 'Invalid QR source';end if;
 insert into public.nx_leads(store_id,customer_name,customer_email,customer_phone,interest,status,request_type,preferred_time,session_id,source_id)
 values(p_store,trim(p_name),coalesce(p_email,''),coalesce(p_phone,''),left('Appointment: '||label||' — '||coalesce(p_notes,''),1500),'Appointment Requested','appointment',p_start::text,p_session,p_source)
 returning id into lid;
 insert into public.nx_appointments(store_id,staff_id,service_id,lead_id,customer_name,customer_email,customer_phone,notes,start_at,end_at,status)
 values(p_store,p_staff,p_service,lid,trim(p_name),coalesce(p_email,''),coalesce(p_phone,''),coalesce(p_notes,''),p_start,p_start+make_interval(mins=>d),case when setting.auto_confirm then 'confirmed' else 'requested' end)
 returning id into aid;
 if setting.auto_confirm then update public.nx_leads set status='Booked' where id=lid;end if;
 return jsonb_build_object('appointmentId',aid,'leadId',lid,'status',case when setting.auto_confirm then 'confirmed' else 'requested' end);
end $$;
revoke all on function public.nx_calendar_book(uuid,uuid,uuid,timestamptz,text,text,text,text,uuid,uuid) from public,anon,authenticated;
grant execute on function public.nx_calendar_book(uuid,uuid,uuid,timestamptz,text,text,text,text,uuid,uuid) to service_role;

create or replace function public.nx_calendar_move(p_store uuid,p_id uuid,p_staff uuid,p_start timestamptz)
returns boolean language plpgsql security definer set search_path='' as $$
declare a public.nx_appointments%rowtype;d int;
begin
 select * into a from public.nx_appointments where id=p_id and store_id=p_store for update;
 if not found or a.status not in ('requested','confirmed') then return false;end if;
 if not public.nx_slot_is_open(p_store,p_staff,a.service_id,p_start,p_id) then return false;end if;
 select duration_minutes into d from public.nx_calendar_services where id=a.service_id and store_id=p_store;
 update public.nx_appointments set staff_id=p_staff,start_at=p_start,end_at=p_start+make_interval(mins=>d),updated_at=now() where id=p_id and store_id=p_store;
 return true;
end $$;
revoke all on function public.nx_calendar_move(uuid,uuid,uuid,timestamptz) from public,anon,authenticated;
grant execute on function public.nx_calendar_move(uuid,uuid,uuid,timestamptz) to service_role;
