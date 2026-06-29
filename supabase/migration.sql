-- Run this in Supabase SQL Editor after creating your project.
-- Also create employee accounts under Authentication → Users → Add user.

create table if not exists client_onboardings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  submitted_by uuid references auth.users(id) not null,

  client_name text not null,
  client_email text,
  client_contact_number text,
  occupation text check (occupation in (
    'government_employee', 'private_employee',
    'small_business', 'business_10_plus'
  )),
  marital_status text check (marital_status in (
    'single', 'married_no_kids', 'married_with_kids', 'divorced_separated'
  )),
  accommodation text check (accommodation in (
    'owned_by_client', 'owned_by_parents',
    'rented_gated', 'rented_not_gated'
  )),
  parent_alternate_phone text,
  loan_amount numeric,
  number_of_lenders integer,
  client_monthly_income numeric,
  salary_bank text,
  salary_date integer check (salary_date between 1 and 31),
  auto_debit_lenders text,
  blank_cheque_lenders text,
  parents_monthly_income numeric,
  other_income_sources numeric,
  family_monthly_income numeric,
  family_monthly_expenses numeric,
  previous_monthly_emi numeric,
  emi_management_notes text,
  loan_reasons text,
  non_payment_reasons text,
  settlement_funds_source text,
  onboarding_call_points text,

  truecaller_premium_agreed boolean,
  cctv_agreed boolean,
  parents_aware boolean,
  early_drop_likelihood text,
  other_comments text,

  advocate_name text not null,
  advocate_email text not null
);

alter table client_onboardings enable row level security;

create policy "Authenticated users can read"
  on client_onboardings for select
  to authenticated using (true);

create policy "Authenticated users can insert"
  on client_onboardings for insert
  to authenticated with check (auth.uid() = submitted_by);

create index if not exists idx_client_name
  on client_onboardings using gin (to_tsvector('english', client_name));
