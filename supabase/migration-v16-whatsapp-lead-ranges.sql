-- WhatsApp Client_Details: store amount ranges + secured/unsecured/both loan types

alter table public.leads
  add column if not exists personal_loan_amount_range text,
  add column if not exists credit_card_amount_range text;

alter table public.leads drop constraint if exists leads_loan_type_check;

update public.leads
set loan_type = 'unsecured'
where loan_type = 'personal_business';

update public.leads
set loan_type = 'both'
where loan_type = 'credit_card';

alter table public.leads
  add constraint leads_loan_type_check check (
    loan_type is null or loan_type in ('secured', 'unsecured', 'both')
  );

alter table public.client_onboardings drop constraint if exists client_onboardings_loan_type_check;

update public.client_onboardings
set loan_type = 'unsecured'
where loan_type = 'personal_business';

update public.client_onboardings
set loan_type = 'both'
where loan_type = 'credit_card';

alter table public.client_onboardings
  add constraint client_onboardings_loan_type_check check (
    loan_type is null or loan_type in ('secured', 'unsecured', 'both')
  );
