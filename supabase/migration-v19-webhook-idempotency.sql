ALTER TABLE public.leads
ADD COLUMN IF NOT EXISTS webhook_idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_leads_webhook_idempotency 
ON public.leads(webhook_idempotency_key);
