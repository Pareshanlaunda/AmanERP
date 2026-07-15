-- Count primary + co-assignees in employee lead stats (no double-count if both).
-- Publish lead_additional_assignees for realtime invalidation on admin dashboard.

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
  IF auth.uid() IS NOT NULL
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  RETURN QUERY
  WITH ownership AS (
    SELECT l.assigned_to AS employee_id, l.status::TEXT AS status
    FROM public.leads l
    WHERE l.assigned_to IS NOT NULL
    UNION ALL
    SELECT a.employee_id, l.status::TEXT AS status
    FROM public.lead_additional_assignees a
    INNER JOIN public.leads l ON l.id = a.lead_id
    WHERE a.employee_id IS DISTINCT FROM l.assigned_to
  )
  SELECT o.employee_id, o.status, COUNT(*)::BIGINT AS count
  FROM ownership o
  GROUP BY o.employee_id, o.status;
END;
$$;

REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_employee_lead_stats() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_lead_stats() TO service_role;

ALTER TABLE public.lead_additional_assignees REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lead_additional_assignees'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_additional_assignees;
  END IF;
END $$;
