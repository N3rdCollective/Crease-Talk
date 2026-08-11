-- Close submission → promote → public profile loop
-- Audio/cover on media_assets, Instagram on artists, tighter submit RLS, public promoted bucket

alter table public.artists
  add column if not exists instagram_url text;

comment on column public.artists.instagram_url is 'Artist Instagram profile URL (from submission or admin)';

alter table public.media_assets
  add column if not exists media_kind text not null default 'youtube'
    check (media_kind in ('youtube', 'audio')),
  add column if not exists audio_file_path text,
  add column if not exists audio_file_url text,
  add column if not exists cover_file_path text,
  add column if not exists cover_file_url text;

comment on column public.media_assets.media_kind is 'youtube = CreaseTalk video; audio = promoted music submission';
comment on column public.media_assets.audio_file_path is 'Path in promoted-tracks (or legacy music-submissions) storage';

create index if not exists media_assets_kind_status_idx
  on public.media_assets (media_kind, approval_status);

-- Existing rows without youtube stay youtube-kind; promoted audio rows set media_kind explicitly

-- Tighten public insert: pending only, no review fields
drop policy if exists "Anyone can submit music" on public.music_submissions;
create policy "Anyone can submit music"
  on public.music_submissions
  for insert
  to anon, authenticated
  with check (
    status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
  );

-- Public bucket for promoted track audio + covers (playable on site)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'promoted-tracks',
  'promoted-tracks',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4',
    'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read promoted tracks" on storage.objects;
create policy "Public can read promoted tracks"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'promoted-tracks');

drop policy if exists "Staff can upload promoted tracks" on storage.objects;
create policy "Staff can upload promoted tracks"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'promoted-tracks'
    and (select public.is_staff())
  );

drop policy if exists "Service role manages promoted tracks" on storage.objects;
-- service_role bypasses RLS; staff delete for cleanup
drop policy if exists "Staff can delete promoted tracks" on storage.objects;
create policy "Staff can delete promoted tracks"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'promoted-tracks'
    and (select public.is_staff())
  );

grant select on public.artists to anon, authenticated;
grant insert, update, delete on public.artists to authenticated;
