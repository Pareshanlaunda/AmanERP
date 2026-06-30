-- Run after migration-leads.sql

alter table public.leads
  add column if not exists onboarding_record_id uuid references public.client_onboardings(id);

create table if not exists public.lead_comments (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references public.leads(id) on delete cascade not null,
  author_id uuid references auth.users(id) not null,
  message text not null,
  created_at timestamptz default now()
);

create table if not exists public.lead_comment_reads (
  lead_id uuid references public.leads(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  last_read_at timestamptz default now(),
  primary key (lead_id, user_id)
);

create index if not exists idx_lead_comments_lead_id on public.lead_comments(lead_id);

alter table public.lead_comments enable row level security;
alter table public.lead_comment_reads enable row level security;

drop policy if exists "Admins full access lead_comments" on public.lead_comments;
create policy "Admins full access lead_comments"
  on public.lead_comments for all
  to authenticated
  using (public.get_user_role() = 'admin')
  with check (public.get_user_role() = 'admin');

drop policy if exists "Employees read comments on assigned leads" on public.lead_comments;
create policy "Employees read comments on assigned leads"
  on public.lead_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.leads
      where id = lead_id and assigned_to = auth.uid()
    )
  );

drop policy if exists "Employees insert comments on assigned leads" on public.lead_comments;
create policy "Employees insert comments on assigned leads"
  on public.lead_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.leads
      where id = lead_id and assigned_to = auth.uid()
    )
  );

drop policy if exists "Users manage own comment reads" on public.lead_comment_reads;
create policy "Users manage own comment reads"
  on public.lead_comment_reads for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Admins read all comment reads" on public.lead_comment_reads;
create policy "Admins read all comment reads"
  on public.lead_comment_reads for select
  to authenticated
  using (public.get_user_role() = 'admin');
