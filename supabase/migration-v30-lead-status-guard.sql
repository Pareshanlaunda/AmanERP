-- Employees may update leads they are assigned to (RLS), but must not forge
-- arbitrary status / onboarding links via the browser client.
-- Allowed transitions match server actions in lib/actions/leads.ts + onboarding.

CREATE OR REPLACE FUNCTION public.enforce_employee_lead_update_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins pass; service role (no JWT user) passes
  IF public.get_user_role() = 'admin' OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
     OR OLD.source IS DISTINCT FROM NEW.source
     OR OLD.webhook_idempotency_key IS DISTINCT FROM NEW.webhook_idempotency_key
     OR OLD.botbiz_subscriber_id IS DISTINCT FROM NEW.botbiz_subscriber_id
     OR OLD.whatsapp_metadata IS DISTINCT FROM NEW.whatsapp_metadata
     OR OLD.created_at IS DISTINCT FROM NEW.created_at
     OR OLD.assigned_at IS DISTINCT FROM NEW.assigned_at
     OR OLD.assignment_comment IS DISTINCT FROM NEW.assignment_comment
  THEN
    RAISE EXCEPTION 'Employees cannot modify protected lead columns';
  END IF;

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NOT (
      (OLD.status = 'assigned' AND NEW.status IN ('in_progress', 'lost'))
      OR (OLD.status = 'in_progress' AND NEW.status IN ('lost', 'converted', 'successful'))
      OR (OLD.status = 'successful' AND NEW.status = 'converted')
    ) THEN
      RAISE EXCEPTION 'Invalid lead status transition';
    END IF;
  END IF;

  -- Onboarding link: set once from null; never clear or replace
  IF OLD.onboarding_record_id IS DISTINCT FROM NEW.onboarding_record_id THEN
    IF OLD.onboarding_record_id IS NOT NULL OR NEW.onboarding_record_id IS NULL THEN
      RAISE EXCEPTION 'Cannot change onboarding link';
    END IF;
  END IF;

  IF OLD.converted_onboarding_id IS DISTINCT FROM NEW.converted_onboarding_id THEN
    IF NEW.status IS DISTINCT FROM 'converted'
       OR NEW.converted_onboarding_id IS DISTINCT FROM COALESCE(NEW.onboarding_record_id, OLD.onboarding_record_id)
    THEN
      RAISE EXCEPTION 'Invalid conversion link';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- One onboarding form claim per lead (race-safe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_onboarding_record_id_unique
  ON public.leads (onboarding_record_id)
  WHERE onboarding_record_id IS NOT NULL;
