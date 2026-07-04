-- Indexes for employee stats, dashboards, and lead detail queries

create index if not exists idx_leads_assigned_to_status
  on public.leads (assigned_to, status);

create index if not exists idx_leads_created_at_desc
  on public.leads (created_at desc);

create index if not exists idx_leads_assigned_at_desc
  on public.leads (assigned_to, assigned_at desc nulls last);

create index if not exists idx_client_onboardings_submitted_by_created
  on public.client_onboardings (submitted_by, created_at desc);

create index if not exists idx_lead_updates_lead_id_created
  on public.lead_updates (lead_id, created_at desc);

create index if not exists idx_lead_comments_lead_id_created
  on public.lead_comments (lead_id, created_at desc);

create index if not exists idx_notifications_user_id_created
  on public.notifications (user_id, created_at desc);

create index if not exists idx_profiles_role
  on public.profiles (role);
