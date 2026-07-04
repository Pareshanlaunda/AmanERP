-- Client list IDs: CLID-YYYYMM##### (superseded by migration-v13-clid-global-sequence.sql for global counter + backfill)

create or replace function public.generate_client_id()
returns text
language plpgsql
as $$
declare
  month_prefix text;
  next_num integer;
begin
  month_prefix := 'CLID-' || to_char(timezone('Asia/Kolkata', now()), 'YYYYMM');

  perform pg_advisory_xact_lock(hashtext('client_id:' || month_prefix));

  select coalesce(
    max(
      case
        when client_id ~ ('^' || month_prefix || '[0-9]{5}$')
          then substring(client_id from char_length(month_prefix) + 1)::integer
        else null
      end
    ),
    0
  ) + 1
  into next_num
  from public.client_onboardings
  where client_id like month_prefix || '%';

  return month_prefix || lpad(next_num::text, 5, '0');
end;
$$;
