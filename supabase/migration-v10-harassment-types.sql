-- Expand harassment values: yes + type dropdown (calls / home visit / both)

alter table public.leads drop constraint if exists leads_harassment_faced_check;

update public.leads
set harassment_faced = 'yes_calls_home_visit'
where harassment_faced = 'yes_calls_home_visit';

alter table public.leads
  add constraint leads_harassment_faced_check check (
    harassment_faced is null or harassment_faced in (
      'no',
      'yes_calls',
      'yes_home_visit',
      'yes_calls_home_visit'
    )
  );

alter table public.client_onboardings drop constraint if exists client_onboardings_harassment_faced_check;

alter table public.client_onboardings
  add constraint client_onboardings_harassment_faced_check check (
    harassment_faced is null or harassment_faced in (
      'no',
      'yes_calls',
      'yes_home_visit',
      'yes_calls_home_visit'
    )
  );
