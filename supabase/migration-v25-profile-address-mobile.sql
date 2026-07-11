-- Employee contact details for letterheads / notices.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS mobile text;

COMMENT ON COLUMN public.profiles.address IS
  'Office / correspondence address shown on notices and letterheads.';
COMMENT ON COLUMN public.profiles.mobile IS
  'Mobile number shown on notices and letterheads.';
