-- v34: unique WhatsApp subscriber id + tighten comment-read RLS

-- Deduplicate before unique index (keep newest lead per subscriber).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY botbiz_subscriber_id
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.leads
  WHERE botbiz_subscriber_id IS NOT NULL
)
UPDATE public.leads l
SET
  botbiz_subscriber_id = NULL,
  updated_at = now()
FROM ranked r
WHERE l.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_botbiz_subscriber_unique
  ON public.leads (botbiz_subscriber_id)
  WHERE botbiz_subscriber_id IS NOT NULL;

-- Comment reads: only for own row AND lead assignee/admin (prevents probing arbitrary leads).
DROP POLICY IF EXISTS "Users manage own comment reads" ON public.lead_comment_reads;
CREATE POLICY "Users manage own comment reads"
  ON public.lead_comment_reads FOR ALL
  TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    AND (
      (SELECT public.get_user_role()) = 'admin'
      OR (SELECT public.is_lead_assignee(lead_id))
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND (
      (SELECT public.get_user_role()) = 'admin'
      OR (SELECT public.is_lead_assignee(lead_id))
    )
  );
