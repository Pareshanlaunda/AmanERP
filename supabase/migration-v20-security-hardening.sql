-- Security hardening: admin-only stats RPCs, employee lead column guard,
-- tighter notification INSERT policy.

-- ---------------------------------------------------------------------------
-- 1) Employee stats RPCs: admin-only + revoke from public/authenticated
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_employee_lead_stats()
RETURNS TABLE (
  employee_id UUID,
  status TEXT,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  SELECT assigned_to AS employee_id, l.status, COUNT(*)::BIGINT AS count
  FROM public.leads l
  WHERE assigned_to IS NOT NULL
  GROUP BY assigned_to, l.status;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_employee_client_counts()
RETURNS TABLE (
  employee_id UUID,
  count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  SELECT submitted_by AS employee_id, COUNT(*)::BIGINT AS count
  FROM public.client_onboardings
  WHERE submitted_by IS NOT NULL
  GROUP BY submitted_by;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_client_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_employee_lead_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_client_counts() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2) Block employees from changing protected lead columns (ownership/source)
-- ---------------------------------------------------------------------------
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
  THEN
    RAISE EXCEPTION 'Employees cannot modify protected lead columns';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_employee_lead_update_columns ON public.leads;
CREATE TRIGGER trg_enforce_employee_lead_update_columns
  BEFORE UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE PROCEDURE public.enforce_employee_lead_update_columns();

-- ---------------------------------------------------------------------------
-- 3) Notifications: admins any target; employees only notify admins
--    (covers lead progress → created_by admin). Service role bypasses RLS.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Internal users insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Employees insert notifications to admins" ON public.notifications;

CREATE POLICY "Admins insert notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.get_user_role() = 'admin');

CREATE POLICY "Employees insert notifications to admins"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'employee'
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_id AND p.role = 'admin'
    )
  );
