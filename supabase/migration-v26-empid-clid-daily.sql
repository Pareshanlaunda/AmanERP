-- Employee codes: EMPID000001+ (global sequence, auto on profile insert)
-- Client IDs: CLIDYYYYMMDDNN (IST calendar day + daily sequence starting at 01)

create sequence if not exists public.employee_code_seq start 1;

alter table public.profiles
  add column if not exists employee_code text;

create unique index if not exists idx_profiles_employee_code
  on public.profiles (employee_code)
  where employee_code is not null;

create or replace function public.generate_employee_code()
returns text
language plpgsql
set search_path = public
as $$
declare
  next_num bigint;
begin
  next_num := nextval('public.employee_code_seq');
  return 'EMPID' || lpad(next_num::text, 6, '0');
end;
$$;

create or replace function public.set_employee_code()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.employee_code is null or new.employee_code = '' then
    new.employee_code := public.generate_employee_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_employee_code on public.profiles;
create trigger trg_set_employee_code
  before insert on public.profiles
  for each row execute function public.set_employee_code();

-- Backfill existing profiles in creation order
do $$
declare
  rec record;
  seq bigint := 0;
begin
  for rec in
    select id
    from public.profiles
    where employee_code is null or employee_code = ''
    order by created_at asc nulls last, id asc
  loop
    seq := seq + 1;
    update public.profiles
    set employee_code = 'EMPID' || lpad(seq::text, 6, '0')
    where id = rec.id;
  end loop;

  if seq > 0 then
    perform setval('public.employee_code_seq', seq, true);
  end if;
end;
$$;

-- Daily CLID: CLID + YYYYMMDD (Asia/Kolkata) + NN (01, 02, …)
create or replace function public.generate_client_id()
returns text
language plpgsql
set search_path = public
as $$
declare
  day_prefix text;
  next_num integer;
begin
  day_prefix := 'CLID' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMMDD');

  perform pg_advisory_xact_lock(hashtext('client_id:' || day_prefix));

  select coalesce(
    max(
      case
        when client_id ~ ('^' || day_prefix || '[0-9]+$')
          then substring(client_id from char_length(day_prefix) + 1)::integer
        else null
      end
    ),
    0
  ) + 1
  into next_num
  from public.client_onboardings
  where client_id like day_prefix || '%';

  return day_prefix || lpad(next_num::text, 2, '0');
end;
$$;

-- Reassign existing clients to daily format (preserve IST day + creation order)
do $$
declare
  rec record;
  day_key text;
  prev_day text := '';
  day_seq integer := 0;
  new_id text;
begin
  for rec in
    select id, created_at
    from public.client_onboardings
    order by timezone('Asia/Kolkata', created_at) asc, id asc
  loop
    day_key := to_char(timezone('Asia/Kolkata', rec.created_at), 'YYYYMMDD');
    if day_key is distinct from prev_day then
      day_seq := 0;
      prev_day := day_key;
    end if;
    day_seq := day_seq + 1;
    new_id := 'CLID' || day_key || lpad(day_seq::text, 2, '0');

    update public.client_onboardings
    set client_id = new_id
    where id = rec.id;
  end loop;
end;
$$;
