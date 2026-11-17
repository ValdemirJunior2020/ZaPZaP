-- Apply last to the dedicated NexusSales AI database.
-- All writes are performed by the verified server, not direct browser REST calls.
revoke insert,update,delete on public.nx_stores from authenticated;
revoke insert,update,delete on public.nx_offerings from authenticated;
revoke insert,update,delete on public.nx_bots from authenticated;
revoke insert,update,delete on public.nx_leads from authenticated;
revoke insert,update,delete on public.nx_owner_profiles from authenticated;
grant select on public.nx_stores,public.nx_offerings,public.nx_bots,
 public.nx_leads,public.nx_owner_profiles to authenticated;
grant all on public.nx_stores,public.nx_offerings,public.nx_bots,
 public.nx_leads,public.nx_owner_profiles,public.nx_entitlements,
 public.nx_whatsapp_channels,public.nx_whatsapp_messages,
 public.nx_abuse_windows,public.nx_chat_daily_usage to service_role;
create index if not exists nx_leads_store_created_idx on public.nx_leads(store_id,created_at desc);
create index if not exists nx_wa_store_idx on public.nx_whatsapp_messages(store_id);
