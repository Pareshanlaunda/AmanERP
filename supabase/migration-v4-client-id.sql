-- Client IDs (CID-000001) and lead rejection fields

create sequence if not exists public.client_id_seq start 1;

alter table public.client_onboardings
  add column if not exists client_id text;

create unique index if not exists idx_client_onboardings_client_id
  on public.client_onboardings(client_id)
  where client_id is not null;

alter table public.leads
  add column if not exists lost_reason text,
  add column if not exists lost_at timestamptz,
  add column if not exists lost_by uuid references auth.users(id);

create or replace function public.generate_client_id()
returns text
language plpgsql
as $$
declare
  next_num bigint;
begin
  next_num := nextval('public.client_id_seq');
  return 'CID-' || lpad(next_num::text, 6, '0');
end;
$$;

create or replace function public.set_client_id()
returns trigger
language plpgsql
as $$
begin
  if new.client_id is null or new.client_id = '' then
    new.client_id := public.generate_client_id();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_client_id on public.client_onboardings;
create trigger trg_set_client_id
  before insert on public.client_onboardings
  for each row execute function public.set_client_id();

-- Backfill existing onboardings in creation order
do $$
declare
  rec record;
begin
  for rec in
    select id from public.client_onboardings
    where client_id is null
    order by created_at asc
  loop
    update public.client_onboardings
    set client_id = public.generate_client_id()
    where id = rec.id;
  end loop;
end;
$$;

alter table public.client_onboardings
  alter column client_id set not null;

create index if not exists idx_client_onboardings_client_id_search
  on public.client_onboardings(client_id);
