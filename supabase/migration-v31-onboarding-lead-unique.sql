-- One onboarding row per lead (blocks double-submit orphans after partial failures).
CREATE UNIQUE INDEX IF NOT EXISTS idx_client_onboardings_lead_id_unique
  ON public.client_onboardings (lead_id)
  WHERE lead_id IS NOT NULL;
