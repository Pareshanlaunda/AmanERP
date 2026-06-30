-- Enable Supabase Realtime for leads, comments, and activity (free tier supported)

do $$
declare
  tbl text;
begin
  foreach tbl in array array['leads', 'lead_comments', 'lead_updates']
  loop
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
    end if;
  end loop;
end $$;
