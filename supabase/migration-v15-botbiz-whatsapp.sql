-- Botbiz / WhatsApp integration metadata on leads

alter table public.leads
  add column if not exists botbiz_subscriber_id text,
  add column if not exists whatsapp_metadata jsonb;

create index if not exists idx_leads_botbiz_subscriber
  on public.leads (botbiz_subscriber_id)
  where botbiz_subscriber_id is not null;

create index if not exists idx_leads_phone_source
  on public.leads (client_phone, source);
