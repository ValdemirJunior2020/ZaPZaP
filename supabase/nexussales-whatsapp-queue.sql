-- Apply to NEW dedicated NexusSales Supabase project only, AFTER nexussales-abuse-whatsapp.sql.
-- WhatsApp durable recovery with leases, exponential retries and dead-letter state.
alter table public.nx_whatsapp_messages
  add column if not exists phone_number_id text,
  add column if not exists sender_phone text,
  add column if not exists incoming_text text,
  add column if not exists attempts integer not null default 0,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists leased_until timestamptz,
  add column if not exists lease_id uuid,
  add column if not exists delivered_at timestamptz,
  add column if not exists last_error text;
alter table public.nx_whatsapp_messages drop constraint if exists nx_whatsapp_messages_status_check;
alter table public.nx_whatsapp_messages add constraint nx_whatsapp_messages_status_check
  check(status in ('queued','processing','sent','failed','dead'));
create index if not exists nx_wa_retry_idx on public.nx_whatsapp_messages(next_attempt_at)
  where status in ('queued','failed','processing');
revoke all on public.nx_whatsapp_messages from public,anon,authenticated;

create or replace function public.nx_enqueue_whatsapp(
  p_message_id text,p_store_id uuid,p_phone_id text,p_sender text,p_text text
) returns boolean language plpgsql security definer set search_path='' as $$
declare inserted text;
begin
 if length(p_message_id) not between 5 and 200 or p_phone_id !~ '^[0-9]{5,30}$'
  or p_sender !~ '^[0-9]{7,20}$' or length(p_text) not between 1 and 700 then
  return false;
 end if;
 if not exists(select 1 from public.nx_whatsapp_channels ch
  where ch.phone_number_id=p_phone_id and ch.store_id=p_store_id and ch.enabled=true)
 then return false; end if;
 insert into public.nx_whatsapp_messages(message_id,store_id,phone_number_id,sender_phone,incoming_text,status)
 values(p_message_id,p_store_id,p_phone_id,p_sender,p_text,'queued')
 on conflict(message_id) do nothing returning message_id into inserted;
 -- Duplicates already persisted are acknowledged. They must never reset attempts.
 return inserted is not null;
end;$$;
revoke all on function public.nx_enqueue_whatsapp(text,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.nx_enqueue_whatsapp(text,uuid,text,text,text) to service_role;

create or replace function public.nx_claim_next_whatsapp()
returns table(message_id text,store_id uuid,phone_number_id text,sender_phone text,incoming_text text,lease_id uuid,attempts integer)
language plpgsql security definer set search_path='' as $$
begin
 return query
 with due as (
  select q.message_id from public.nx_whatsapp_messages q
  where q.attempts<5 and (
    (q.status in ('queued','failed') and q.next_attempt_at<=now()) or
    (q.status='processing' and q.leased_until<now())
  ) and q.phone_number_id is not null
  order by q.created_at
  for update skip locked limit 1
 ), claimed as (
  update public.nx_whatsapp_messages q
  set status='processing', attempts=q.attempts+1,lease_id=gen_random_uuid(),
      leased_until=now()+interval '2 minutes',last_error=null
  from due where q.message_id=due.message_id
  returning q.message_id,q.store_id,q.phone_number_id,q.sender_phone,q.incoming_text,q.lease_id,q.attempts
 )
 select c.message_id,c.store_id,c.phone_number_id,c.sender_phone,c.incoming_text,c.lease_id,c.attempts from claimed c;
end;$$;
revoke all on function public.nx_claim_next_whatsapp() from public,anon,authenticated;
grant execute on function public.nx_claim_next_whatsapp() to service_role;

create or replace function public.nx_finish_whatsapp(
 p_message_id text,p_lease_id uuid,p_success boolean,p_error text default null
)returns boolean language plpgsql security definer set search_path='' as $$
declare found text;
begin
 update public.nx_whatsapp_messages q
 set status=case when p_success then 'sent' when q.attempts>=5 then 'dead' else 'failed' end,
     delivered_at=case when p_success then now() else q.delivered_at end,
     last_error=case when p_success then null else left(coalesce(p_error,'delivery failed'),300) end,
     next_attempt_at=case when p_success then q.next_attempt_at
       else now() + make_interval(mins=>least(30,power(2,q.attempts)::integer)) end,
     lease_id=null,leased_until=null
 where q.message_id=p_message_id and q.lease_id=p_lease_id and q.status='processing'
 returning q.message_id into found;
 return found is not null;
end;$$;
revoke all on function public.nx_finish_whatsapp(text,uuid,boolean,text) from public,anon,authenticated;
grant execute on function public.nx_finish_whatsapp(text,uuid,boolean,text) to service_role;
-- Monitoring: alert on status='dead' or processing older than 2m; recover manually after investigation.
-- Note: Meta outbound messages have no universal exactly-once transaction with our database.
-- A network timeout after Meta accepts delivery may result in a duplicate during recovery.
