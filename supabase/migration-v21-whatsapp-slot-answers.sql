-- Hybrid WhatsApp slot answers (button / free-text / media) for lead UI
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS whatsapp_slot_answers jsonb;

COMMENT ON COLUMN public.leads.whatsapp_slot_answers IS
  'Per Client_Details slot: { slot, kind: button|text|media, raw, canonical? }';

-- Protect new column from employee client updates (extends v20 trigger)
CREATE OR REPLACE FUNCTION public.enforce_employee_lead_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() = 'admin' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
     OR OLD.source IS DISTINCT FROM NEW.source
     OR OLD.webhook_idempotency_key IS DISTINCT FROM NEW.webhook_idempotency_key
     OR OLD.botbiz_subscriber_id IS DISTINCT FROM NEW.botbiz_subscriber_id
     OR OLD.whatsapp_metadata IS DISTINCT FROM NEW.whatsapp_metadata
     OR OLD.whatsapp_slot_answers IS DISTINCT FROM NEW.whatsapp_slot_answers
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
  THEN
    RAISE EXCEPTION 'Employees cannot modify protected lead columns';
  END IF;

  RETURN NEW;
END;
$$;
