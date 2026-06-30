-- Lead fields: alternate phone, loan amount, loan type

alter table public.leads
  add column if not exists client_alternate_phone text,
  add column if not exists loan_amount numeric,
  add column if not exists loan_type text check (
    loan_type is null or loan_type in ('secured', 'unsecured', 'credit_card')
  );
