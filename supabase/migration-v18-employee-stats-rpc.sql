-- Drop if they exist to allow clean recreation
DROP FUNCTION IF EXISTS public.get_employee_lead_stats();
DROP FUNCTION IF EXISTS public.get_employee_client_counts();

-- Function to aggregate lead stats by employee and status
CREATE OR REPLACE FUNCTION public.get_employee_lead_stats()
RETURNS TABLE (
  employee_id UUID,
  status TEXT,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT assigned_to AS employee_id, status, COUNT(*) AS count
  FROM public.leads
  WHERE assigned_to IS NOT NULL
  GROUP BY assigned_to, status;
$$;

-- Function to aggregate client onboarding counts by employee
CREATE OR REPLACE FUNCTION public.get_employee_client_counts()
RETURNS TABLE (
  employee_id UUID,
  count BIGINT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT submitted_by AS employee_id, COUNT(*) AS count
  FROM public.client_onboardings
  WHERE submitted_by IS NOT NULL
  GROUP BY submitted_by;
$$;
