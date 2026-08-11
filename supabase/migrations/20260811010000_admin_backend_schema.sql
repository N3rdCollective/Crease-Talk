-- CreaseTalk Admin backend: staff helpers, artists extensions, media, submissions, storage

-- ---------------------------------------------------------------------------
-- Role helpers (app_metadata.role — never user_metadata)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') in ('webmaster', 'admin', 'staff'),
    false
  );
$$;

create or replace function public.is_webmaster()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce(
    (select auth.jwt() -> 'app_metadata' ->> 'role') = 'webmaster',
    false
  );
$$;

revoke all on function public.is_staff() from public;
revoke all on function public.is_webmaster() from public;
grant execute on function public.is_staff() to authenticated, anon;
grant execute on function public.is_webmaster() to authenticated, anon;

-- ---------------------------------------------------------------------------
-- Extend artists
-- ---------------------------------------------------------------------------
alter table public.artists
  add column if not exists youtube_channel_id text,
  add column if not exists is_verified boolean not null default false,
  add column if not exists bio text;

create index if not exists artists_youtube_channel_id_idx
  on public.artists (youtube_channel_id)
  where youtube_channel_id is not null;

drop policy if exists "Staff can insert artists" on public.artists;
create policy "Staff can insert artists"
  on public.artists
  for insert
  to authenticated
  with check ( (select public.is_staff()) );

drop policy if exists "Staff can update artists" on public.artists;
create policy "Staff can update artists"
  on public.artists
  for update
  to authenticated
  using ( (select public.is_staff()) )
  with check ( (select public.is_staff()) );

drop policy if exists "Staff can delete artists" on public.artists;
create policy "Staff can delete artists"
  on public.artists
  for delete
  to authenticated
  using ( (select public.is_staff()) );

-- ---------------------------------------------------------------------------
-- media_assets
-- ---------------------------------------------------------------------------
create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid references public.artists (id) on delete set null,
  youtube_video_id text unique,
  title text not null,
  parsed_artist_name text,
  thumbnail_url text,
  published_at timestamptz,
  duration_seconds integer not null default 0,
  view_count integer not null default 0,
  category text not null default 'other'
    check (category in ('performance', 'interview', 'other')),
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  is_featured boolean not null default false,
  submission_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists media_assets_approval_published_idx
  on public.media_assets (approval_status, published_at desc);

create index if not exists media_assets_artist_id_idx
  on public.media_assets (artist_id);

create index if not exists media_assets_category_status_idx
  on public.media_assets (category, approval_status);

alter table public.media_assets enable row level security;

drop policy if exists "Public can read approved media" on public.media_assets;
create policy "Public can read approved media"
  on public.media_assets
  for select
  to anon, authenticated
  using (approval_status = 'approved' or (select public.is_staff()));

drop policy if exists "Staff can insert media" on public.media_assets;
create policy "Staff can insert media"
  on public.media_assets
  for insert
  to authenticated
  with check ( (select public.is_staff()) );

drop policy if exists "Staff can update media" on public.media_assets;
create policy "Staff can update media"
  on public.media_assets
  for update
  to authenticated
  using ( (select public.is_staff()) )
  with check ( (select public.is_staff()) );

drop policy if exists "Staff can delete media" on public.media_assets;
create policy "Staff can delete media"
  on public.media_assets
  for delete
  to authenticated
  using ( (select public.is_staff()) );

grant select on public.media_assets to anon, authenticated;
grant insert, update, delete on public.media_assets to authenticated;

-- ---------------------------------------------------------------------------
-- music_submissions
-- ---------------------------------------------------------------------------
create table if not exists public.music_submissions (
  id uuid primary key default gen_random_uuid(),
  artist_name text not null,
  track_title text not null,
  contact_email text not null,
  audio_file_path text,
  audio_file_url text,
  notes text,
  status text not null default 'pending'
    check (status in ('pending', 'under_review', 'approved', 'rejected')),
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FK from media_assets.submission_id after submissions exist
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'media_assets_submission_id_fkey'
  ) then
    alter table public.media_assets
      add constraint media_assets_submission_id_fkey
      foreign key (submission_id) references public.music_submissions (id)
      on delete set null;
  end if;
end $$;

create index if not exists music_submissions_status_created_idx
  on public.music_submissions (status, created_at desc);

alter table public.music_submissions enable row level security;

drop policy if exists "Anyone can submit music" on public.music_submissions;
create policy "Anyone can submit music"
  on public.music_submissions
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Staff can read submissions" on public.music_submissions;
create policy "Staff can read submissions"
  on public.music_submissions
  for select
  to authenticated
  using ( (select public.is_staff()) );

drop policy if exists "Staff can update submissions" on public.music_submissions;
create policy "Staff can update submissions"
  on public.music_submissions
  for update
  to authenticated
  using ( (select public.is_staff()) )
  with check ( (select public.is_staff()) );

drop policy if exists "Staff can delete submissions" on public.music_submissions;
create policy "Staff can delete submissions"
  on public.music_submissions
  for delete
  to authenticated
  using ( (select public.is_staff()) );

grant insert on public.music_submissions to anon, authenticated;
grant select, update, delete on public.music_submissions to authenticated;

-- ---------------------------------------------------------------------------
-- staff_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.staff_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  handle text unique,
  title text,
  bio text,
  is_visible_to_staff boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.staff_profiles enable row level security;

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

drop policy if exists "Users can update own staff profile" on public.staff_profiles;
create policy "Users can update own staff profile"
  on public.staff_profiles
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_webmaster())
  )
  with check (
    user_id = (select auth.uid())
    or (select public.is_webmaster())
  );

drop policy if exists "Webmaster can insert staff profiles" on public.staff_profiles;
create policy "Webmaster can insert staff profiles"
  on public.staff_profiles
  for insert
  to authenticated
  with check ( (select public.is_webmaster()) );

drop policy if exists "Webmaster can delete staff profiles" on public.staff_profiles;
create policy "Webmaster can delete staff profiles"
  on public.staff_profiles
  for delete
  to authenticated
  using ( (select public.is_webmaster()) );

grant select, update on public.staff_profiles to authenticated;
grant insert, delete on public.staff_profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Storage: music-submissions (private)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'music-submissions',
  'music-submissions',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4', 'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Anyone can upload music submissions" on storage.objects;
create policy "Anyone can upload music submissions"
  on storage.objects
  for insert
  to anon, authenticated
  with check (bucket_id = 'music-submissions');

drop policy if exists "Staff can read music submissions" on storage.objects;
create policy "Staff can read music submissions"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'music-submissions'
    and (select public.is_staff())
  );

drop policy if exists "Staff can delete music submissions" on storage.objects;
create policy "Staff can delete music submissions"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'music-submissions'
    and (select public.is_staff())
  );

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists artists_set_updated_at on public.artists;
create trigger artists_set_updated_at
  before update on public.artists
  for each row execute function public.set_updated_at();

drop trigger if exists media_assets_set_updated_at on public.media_assets;
create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

drop trigger if exists music_submissions_set_updated_at on public.music_submissions;
create trigger music_submissions_set_updated_at
  before update on public.music_submissions
  for each row execute function public.set_updated_at();

drop trigger if exists staff_profiles_set_updated_at on public.staff_profiles;
create trigger staff_profiles_set_updated_at
  before update on public.staff_profiles
  for each row execute function public.set_updated_at();

comment on table public.media_assets is 'YouTube and promoted media; public reads approved only';
comment on table public.music_submissions is 'Community music submissions; public insert, staff review';
comment on table public.staff_profiles is 'Staff directory; Phantom Operator is hidden from all staff except himself';
