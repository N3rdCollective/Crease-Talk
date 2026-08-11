-- Admins (site owners) can see hidden staff including the Phantom Operator.
-- Regular staff cannot.

create or replace function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'admin',
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated, anon;

drop policy if exists "Staff can read visible profiles" on public.staff_profiles;
create policy "Staff can read visible profiles"
  on public.staff_profiles
  for select
  to authenticated
  using (
    (select public.is_staff())
    and (
      is_visible_to_staff = true
      or user_id = (select auth.uid())
      or (select public.is_admin())
    )
  );

comment on policy "Staff can read visible profiles" on public.staff_profiles is
  'Visible staff for all staff; hidden profiles (Phantom Operator) only for self or admin owners.';
