-- Run after migration.sql in Supabase SQL Editor.

-- Profiles (roles)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  role text not null check (role in ('admin', 'employee')),
  created_at timestamptz default now()
);

-- Leads pipeline
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  created_by uuid references auth.users(id) not null,
  client_name text not null,
  client_phone text,
  client_email text,
  notes text,
  source text not null default 'manual',
  status text not null default 'new' check (status in (
    'new', 'assigned', 'in_progress', 'successful', 'converted', 'lost'
  )),
  assigned_to uuid references auth.users(id),
  assigned_at timestamptz,
  assignment_comment text,
  converted_onboarding_id uuid
);

-- Link onboardings to leads (FK added after client_onboardings exists)
alter table public.client_onboardings
  add column if not exists lead_id uuid references public.leads(id);

alter table public.leads
  drop constraint if exists leads_converted_onboarding_id_fkey;

alter table public.leads
  add constraint leads_converted_onboarding_id_fkey
  foreign key (converted_onboarding_id) references public.client_onboardings(id);

-- Lead progress updates
create table if not exists public.lead_updates (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade not null,
  updated_by uuid references auth.users(id) not null,
  note text not null,
  status text check (status in (
    'new', 'assigned', 'in_progress', 'successful', 'converted', 'lost'
  )),
  created_at timestamptz default now()
);

-- In-app notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('lead_assigned', 'lead_converted', 'lead_updated')),
  title text not null,
  body text not null,
  lead_id uuid references public.leads(id) on delete set null,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_assigned_to on public.leads(assigned_to);
create index if not exists idx_notifications_user_id on public.notifications(user_id);

-- Role helper for RLS
create or replace function public.get_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_updates enable row level security;
alter table public.notifications enable row level security;

-- Profiles policies
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.get_user_role() = 'admin');

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles for insert
  to authenticated
  with check (public.get_user_role() = 'admin' or not exists (
    select 1 from public.profiles where id = auth.uid()
  ));

drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles"
  on public.profiles for update
  to authenticated
  using (public.get_user_role() = 'admin');

-- Leads policies
drop policy if exists "Admins full access to leads" on public.leads;
create policy "Admins full access to leads"
  on public.leads for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "Employees read assigned leads" on public.leads;
create policy "Employees read assigned leads"
  on public.leads for select
  to authenticated
  using (assigned_to = auth.uid());

drop policy if exists "Employees update assigned leads" on public.leads;
create policy "Employees update assigned leads"
  on public.leads for update
  to authenticated
  using (assigned_to = auth.uid())
  with check (assigned_to = auth.uid());

-- Lead updates policies
drop policy if exists "Admins full access to lead_updates" on public.lead_updates;
create policy "Admins full access to lead_updates"
  on public.lead_updates for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "Employees insert updates on assigned leads" on public.lead_updates;
create policy "Employees insert updates on assigned leads"
  on public.lead_updates for insert
  to authenticated
  with check (
    exists (
      select 1 from public.leads
      where id = lead_id and assigned_to = auth.uid()
    )
  );

drop policy if exists "Employees read updates on assigned leads" on public.lead_updates;
create policy "Employees read updates on assigned leads"
  on public.lead_updates for select
  to authenticated
  using (
    exists (
      select 1 from public.leads
      where id = lead_id and assigned_to = auth.uid()
    )
  );

-- Notifications policies
drop policy if exists "Users read own notifications" on public.notifications;
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users update own notifications" on public.notifications;
create policy "Users update own notifications"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Internal users insert notifications" on public.notifications;
create policy "Internal users insert notifications"
  on public.notifications for insert
  to authenticated
  with check (public.get_user_role() in ('admin', 'employee'));

-- Replace flat client_onboardings policies
drop policy if exists "Authenticated users can read" on public.client_onboardings;
drop policy if exists "Authenticated users can insert" on public.client_onboardings;

drop policy if exists "Admins read all onboardings" on public.client_onboardings;
create policy "Admins read all onboardings"
  on public.client_onboardings for select
  to authenticated
  using (public.get_user_role() = 'admin');

drop policy if exists "Employees read own onboardings" on public.client_onboardings;
create policy "Employees read own onboardings"
  on public.client_onboardings for select
  to authenticated
  using (submitted_by = auth.uid());

drop policy if exists "Employees insert own onboardings" on public.client_onboardings;
create policy "Employees insert own onboardings"
  on public.client_onboardings for insert
  to authenticated
  with check (submitted_by = auth.uid());

-- Backfill existing users as employees (uncomment and run once if needed):
-- insert into public.profiles (id, full_name, role)
-- select id, coalesce(raw_user_meta_data->>'full_name', email), 'employee'
-- from auth.users
-- on conflict (id) do nothing;
