-- Production security hardening (Hostinger / public launch).
-- Fixes Security Advisor: RLS on _app_migrations, anon EXECUTE on SECURITY DEFINER,
-- mutable search_path on set_client_id, assignee read on client_onboardings.

-- ---------------------------------------------------------------------------
-- 1) _app_migrations: enable RLS, no policies → deny anon/authenticated
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS public._app_migrations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._app_migrations FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Revoke SECURITY DEFINER RPC from anon (+ trigger fn from API roles)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_user_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_user_role() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_user_role() TO authenticated;

REVOKE ALL ON FUNCTION public.is_lead_assignee(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_lead_assignee(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_lead_assignee(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_lead_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_employee_client_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_client_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_client_counts() TO service_role;

-- Trigger-only: not callable via PostgREST
REVOKE ALL ON FUNCTION public.enforce_employee_lead_update_columns() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enforce_employee_lead_update_columns() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3) set_client_id: fixed search_path + not callable via API
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_client_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.client_id IS NULL OR NEW.client_id = '' THEN
    NEW.client_id := public.generate_client_id();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.set_client_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_client_id() FROM anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4) Lead assignees may SELECT client_onboardings for their leads
--    (aligns with notice policies that use is_lead_assignee)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Assignees read lead onboardings" ON public.client_onboardings;
CREATE POLICY "Assignees read lead onboardings"
  ON public.client_onboardings FOR SELECT
  TO authenticated
  USING (
    lead_id IS NOT NULL
    AND public.is_lead_assignee(lead_id)
  );
