-- Optional additional employees on a lead (primary remains leads.assigned_to).

CREATE TABLE IF NOT EXISTS public.lead_additional_assignees (
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (lead_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_lead_additional_assignees_employee
  ON public.lead_additional_assignees(employee_id);

CREATE INDEX IF NOT EXISTS idx_lead_additional_assignees_lead
  ON public.lead_additional_assignees(lead_id);

COMMENT ON TABLE public.lead_additional_assignees IS
  'Optional co-assignees for a lead. Primary owner stays leads.assigned_to.';

-- True if current user is primary or additional assignee of the lead.
CREATE OR REPLACE FUNCTION public.is_lead_assignee(p_lead_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.leads l
      WHERE l.id = p_lead_id
        AND l.assigned_to = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.lead_additional_assignees a
      WHERE a.lead_id = p_lead_id
        AND a.employee_id = auth.uid()
    );
$$;

REVOKE ALL ON FUNCTION public.is_lead_assignee(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_lead_assignee(uuid) TO authenticated;

ALTER TABLE public.lead_additional_assignees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to lead_additional_assignees"
  ON public.lead_additional_assignees;
CREATE POLICY "Admins full access to lead_additional_assignees"
  ON public.lead_additional_assignees FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Employees read own additional assignments"
  ON public.lead_additional_assignees;
CREATE POLICY "Employees read own additional assignments"
  ON public.lead_additional_assignees FOR SELECT
  TO authenticated
  USING (
    employee_id = auth.uid()
    OR public.is_lead_assignee(lead_id)
    OR public.get_user_role() = 'admin'
  );

-- Leads: employees can read/update if primary OR additional assignee
DROP POLICY IF EXISTS "Employees read assigned leads" ON public.leads;
CREATE POLICY "Employees read assigned leads"
  ON public.leads FOR SELECT
  TO authenticated
  USING (public.is_lead_assignee(id));

DROP POLICY IF EXISTS "Employees update assigned leads" ON public.leads;
CREATE POLICY "Employees update assigned leads"
  ON public.leads FOR UPDATE
  TO authenticated
  USING (public.is_lead_assignee(id))
  WITH CHECK (public.is_lead_assignee(id));

-- Lead updates
DROP POLICY IF EXISTS "Employees insert updates on assigned leads" ON public.lead_updates;
CREATE POLICY "Employees insert updates on assigned leads"
  ON public.lead_updates FOR INSERT
  TO authenticated
  WITH CHECK (public.is_lead_assignee(lead_id));

DROP POLICY IF EXISTS "Employees read updates on assigned leads" ON public.lead_updates;
CREATE POLICY "Employees read updates on assigned leads"
  ON public.lead_updates FOR SELECT
  TO authenticated
  USING (public.is_lead_assignee(lead_id));

-- Lead comments (from migration-v2)
DROP POLICY IF EXISTS "Employees read comments on assigned leads" ON public.lead_comments;
CREATE POLICY "Employees read comments on assigned leads"
  ON public.lead_comments FOR SELECT
  TO authenticated
  USING (public.is_lead_assignee(lead_id));

DROP POLICY IF EXISTS "Employees insert comments on assigned leads" ON public.lead_comments;
CREATE POLICY "Employees insert comments on assigned leads"
  ON public.lead_comments FOR INSERT
  TO authenticated
  WITH CHECK (
    author_id = auth.uid()
    AND public.is_lead_assignee(lead_id)
  );
