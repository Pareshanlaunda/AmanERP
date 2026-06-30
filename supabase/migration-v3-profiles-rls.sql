-- Fix profiles RLS: avoid get_user_role() when reading your own row

drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

create policy "Users can read own profile"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy "Admins can read all profiles"
  on public.profiles for select
  to authenticated
  using (public.get_user_role() = 'admin');
