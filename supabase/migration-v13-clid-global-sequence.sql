-- CLID-YYYYMM#####: YYYYMM reflects onboard month (IST); ##### is a global client counter (never resets).

create or replace function public.generate_client_id()
returns text
language plpgsql
as $$
declare
  date_prefix text;
  next_num bigint;
begin
  date_prefix := to_char(timezone('Asia/Kolkata', now()), 'YYYYMM');
  next_num := nextval('public.client_id_seq');
  return 'CLID-' || date_prefix || lpad(next_num::text, 5, '0');
end;
$$;

-- Reassign every existing client (CID-* or older CLID-*) to the new format, preserving creation order.
do $$
declare
  rec record;
  seq bigint := 0;
  new_id text;
begin
  for rec in
    select id, created_at
    from public.client_onboardings
    order by created_at asc, id asc
  loop
    seq := seq + 1;
    new_id :=
      'CLID-' ||
      to_char(timezone('Asia/Kolkata', rec.created_at), 'YYYYMM') ||
      lpad(seq::text, 5, '0');

    update public.client_onboardings
    set client_id = new_id
    where id = rec.id;
  end loop;

  if seq > 0 then
    perform setval('public.client_id_seq', seq, true);
  end if;
end;
$$;
