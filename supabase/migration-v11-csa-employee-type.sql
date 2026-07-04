-- Add CSA employee type

alter table public.profiles drop constraint if exists profiles_employee_type_check;

alter table public.profiles
  add constraint profiles_employee_type_check check (
    employee_type is null or employee_type in (
      'advocate', 'csa', 'hr', 'director', 'finance', 'general'
    )
  );
