-- Fix admin dashboard employee counts staying at 0.
--
-- App calls these RPCs with the service_role key (createAdminClient).
-- v20/v27 left an admin-only gate via get_user_role(), but service_role
-- JWTs have auth.uid() = null → get_user_role() is null → RAISE always.
-- EXECUTE is granted only to service_role (v27), so null-uid callers are OK.

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
  -- service_role JWT has no auth.uid(); only service_role has EXECUTE.
  -- User JWTs must be admin.
  IF auth.uid() IS NOT NULL
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  SELECT l.assigned_to AS employee_id, l.status::TEXT, COUNT(*)::BIGINT AS count
  FROM public.leads l
  WHERE l.assigned_to IS NOT NULL
  GROUP BY l.assigned_to, l.status;
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
  IF auth.uid() IS NOT NULL
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  SELECT c.submitted_by AS employee_id, COUNT(*)::BIGINT AS count
  FROM public.client_onboardings c
  WHERE c.submitted_by IS NOT NULL
  GROUP BY c.submitted_by;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_lead_stats() TO service_role;

REVOKE ALL ON FUNCTION public.get_employee_client_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_client_counts() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_client_counts() TO service_role;
