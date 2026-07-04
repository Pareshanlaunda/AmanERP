-- Employee types, loan types, harassment, and structured lead outcomes

-- Employee type on profiles (staff category; role still controls access)
alter table public.profiles
  add column if not exists employee_type text check (
    employee_type is null or employee_type in ('advocate', 'hr', 'director', 'finance', 'general')
  );

update public.profiles
set employee_type = 'general'
where role = 'employee' and employee_type is null;

-- Loan type values on leads
alter table public.leads drop constraint if exists leads_loan_type_check;

update public.leads
set loan_type = 'personal_business'
where loan_type in ('secured', 'unsecured');

alter table public.leads
  add constraint leads_loan_type_check check (
    loan_type is null or loan_type in ('personal_business', 'credit_card', 'both')
  );

-- Harassment + latest outcome on leads
alter table public.leads
  add column if not exists harassment_faced text check (
    harassment_faced is null or harassment_faced in ('yes_calls_home_visit', 'no')
  );

alter table public.leads
  add column if not exists latest_outcome_category text check (
    latest_outcome_category is null or latest_outcome_category in ('active', 'drop', 'reschedule', 'successful')
  );

alter table public.leads
  add column if not exists latest_outcome_reason text;

-- Structured outcomes on timeline entries
alter table public.lead_updates
  add column if not exists outcome_category text check (
    outcome_category is null or outcome_category in ('active', 'drop', 'reschedule', 'successful')
  );

alter table public.lead_updates
  add column if not exists outcome_reason text;

-- Onboarding form extras
alter table public.client_onboardings
  add column if not exists loan_type text check (
    loan_type is null or loan_type in ('personal_business', 'credit_card', 'both')
  );

alter table public.client_onboardings
  add column if not exists harassment_faced text check (
    harassment_faced is null or harassment_faced in ('yes_calls_home_visit', 'no')
  );
