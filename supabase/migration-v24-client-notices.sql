-- Reply notices generated from client onboardings.

CREATE TABLE IF NOT EXISTS public.client_notices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_onboarding_id uuid NOT NULL REFERENCES public.client_onboardings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  advocate_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  template_type text NOT NULL,
  notice_no text NOT NULL,
  notice_date date NOT NULL,
  expiry_date date NOT NULL,
  loan_id_bearing_no text NOT NULL,
  ref_number text NOT NULL,
  reply_to_name text NOT NULL,
  reply_to_address text NOT NULL,
  reason_keys text[] NOT NULL DEFAULT '{}',
  reason_texts text[] NOT NULL DEFAULT '{}',
  additional_reason text,
  copy_to_advocate boolean NOT NULL DEFAULT true,
  copy_to_advocate_name text,
  copy_to_advocate_address text,
  reference_number_on_notice text NOT NULL,
  signature_mode text NOT NULL CHECK (signature_mode IN ('digital', 'manual')),
  enable_dates boolean NOT NULL DEFAULT false,
  signing_advocate_name text,
  signing_advocate_email text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_notices_client
  ON public.client_notices(client_onboarding_id);

CREATE INDEX IF NOT EXISTS idx_client_notices_created_by
  ON public.client_notices(created_by);

CREATE INDEX IF NOT EXISTS idx_client_notices_created_at
  ON public.client_notices(created_at DESC);

COMMENT ON TABLE public.client_notices IS
  'Saved Reply Notice form submissions; used to regenerate Word/PDF/Excel exports.';

ALTER TABLE public.client_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full access to client_notices" ON public.client_notices;
CREATE POLICY "Admins full access to client_notices"
  ON public.client_notices FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'admin')
  WITH CHECK (public.get_user_role() = 'admin');

DROP POLICY IF EXISTS "Employees select own client notices" ON public.client_notices;
CREATE POLICY "Employees select own client notices"
  ON public.client_notices FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'admin'
    OR EXISTS (
      SELECT 1
      FROM public.client_onboardings c
      WHERE c.id = client_onboarding_id
        AND (
          c.submitted_by = auth.uid()
          OR (
            c.lead_id IS NOT NULL
            AND public.is_lead_assignee(c.lead_id)
          )
        )
    )
  );

DROP POLICY IF EXISTS "Employees insert notices for accessible clients" ON public.client_notices;
CREATE POLICY "Employees insert notices for accessible clients"
  ON public.client_notices FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND (
      public.get_user_role() = 'admin'
      OR EXISTS (
        SELECT 1
        FROM public.client_onboardings c
        WHERE c.id = client_onboarding_id
          AND (
            c.submitted_by = auth.uid()
            OR (
              c.lead_id IS NOT NULL
              AND public.is_lead_assignee(c.lead_id)
            )
          )
      )
    )
  );
