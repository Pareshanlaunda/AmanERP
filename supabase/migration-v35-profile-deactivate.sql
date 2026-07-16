-- Soft-deactivate employees: keep audit FKs, revoke login, hide from assignment pickers.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz;

COMMENT ON COLUMN public.profiles.is_active IS
  'False when employee removed/deactivated; profile row kept for audit history.';
COMMENT ON COLUMN public.profiles.deactivated_at IS
  'When admin deactivated the employee account.';

CREATE INDEX IF NOT EXISTS idx_profiles_active_employees
  ON public.profiles (role, is_active)
  WHERE role = 'employee';
