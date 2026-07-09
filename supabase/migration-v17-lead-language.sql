-- Multilingual lead support: store the language the customer chatted in
-- and preserve the full raw WhatsApp payload for audit/context.

-- Preferred language (detected from Botbiz flow selection)
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferred_language text
    DEFAULT 'en'
    CHECK (preferred_language IN ('en', 'hi', 'mr'));

-- Index for filtering leads by language
CREATE INDEX IF NOT EXISTS idx_leads_preferred_language
  ON public.leads(preferred_language);

-- Add a comment explaining the column
COMMENT ON COLUMN public.leads.preferred_language IS
  'Language the customer selected in the WhatsApp bot flow: en=English, hi=Hindi, mr=Marathi';
