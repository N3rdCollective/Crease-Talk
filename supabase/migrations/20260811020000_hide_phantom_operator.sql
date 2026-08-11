-- Phantom Operator (Epidemik) is only visible to himself, not other staff/admins
update public.staff_profiles
set is_visible_to_staff = false
where handle = 'epidemik'
   or display_name ilike 'Epidemik';

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
    )
  );

comment on column public.staff_profiles.is_visible_to_staff is
  'When false, only the profile owner can see this row (e.g. Phantom Operator).';
