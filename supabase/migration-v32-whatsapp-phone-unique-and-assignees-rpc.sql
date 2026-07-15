-- 1) Dedupe WhatsApp leads that share the same normalized phone (keep best open/oldest).
-- 2) Unique expression index so concurrent webhook/sync cannot insert a second lead.
-- 3) Atomic replace of additional assignees (single transaction RPC).

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY
        CASE
          WHEN length(regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g')) = 10
            THEN '91' || regexp_replace(client_phone, '\D', '', 'g')
          ELSE regexp_replace(COALESCE(client_phone, ''), '\D', '', 'g')
        END
      ORDER BY
        CASE status
          WHEN 'in_progress' THEN 0
          WHEN 'assigned' THEN 1
          WHEN 'new' THEN 2
          WHEN 'successful' THEN 3
          WHEN 'converted' THEN 4
          ELSE 5
        END,
        created_at ASC NULLS LAST
    ) AS rn
  FROM public.leads
  WHERE source = 'whatsapp'
    AND client_phone IS NOT NULL
    AND regexp_replace(client_phone, '\D', '', 'g') <> ''
)
UPDATE public.leads l
SET
  client_phone = NULL,
  notes = TRIM(BOTH FROM COALESCE(l.notes, '') || ' [duplicate WhatsApp phone cleared for uniqueness]'),
  updated_at = now()
FROM ranked r
WHERE l.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_whatsapp_norm_phone_unique
  ON public.leads (
    (
      CASE
        WHEN length(regexp_replace(client_phone, '\D', '', 'g')) = 10
          THEN '91' || regexp_replace(client_phone, '\D', '', 'g')
        ELSE regexp_replace(client_phone, '\D', '', 'g')
      END
    )
  )
  WHERE source = 'whatsapp'
    AND client_phone IS NOT NULL
    AND regexp_replace(client_phone, '\D', '', 'g') <> '';

CREATE OR REPLACE FUNCTION public.replace_lead_additional_assignees(
  p_lead_id uuid,
  p_employee_ids uuid[],
  p_assigned_by uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL
     AND public.get_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  DELETE FROM public.lead_additional_assignees
  WHERE lead_id = p_lead_id;

  IF p_employee_ids IS NOT NULL AND cardinality(p_employee_ids) > 0 THEN
    INSERT INTO public.lead_additional_assignees (lead_id, employee_id, assigned_by)
    SELECT p_lead_id, emp_id, p_assigned_by
    FROM unnest(p_employee_ids) AS emp_id
    WHERE emp_id IS DISTINCT FROM (
      SELECT assigned_to FROM public.leads WHERE id = p_lead_id
    );
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_lead_additional_assignees(uuid, uuid[], uuid) TO authenticated;
