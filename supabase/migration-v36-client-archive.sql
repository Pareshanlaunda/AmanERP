-- Soft-remove clients from employee dashboard; keep row for audit / notices / CLID history.

ALTER TABLE public.client_onboardings
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public.client_onboardings.archived_at IS
  'When employee hid client from My clients; row kept for history.';
COMMENT ON COLUMN public.client_onboardings.archived_by IS
  'Employee who archived the client from their dashboard.';

CREATE INDEX IF NOT EXISTS idx_client_onboardings_active_submitted
  ON public.client_onboardings (submitted_by, created_at desc)
  WHERE archived_at IS NULL;
