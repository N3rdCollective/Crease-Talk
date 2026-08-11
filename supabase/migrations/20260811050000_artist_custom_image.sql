-- Allow staff to set a custom artist main image that Spotify sync will not overwrite

alter table public.artists
  add column if not exists image_locked boolean not null default false;

comment on column public.artists.image_locked is
  'When true, Spotify enrichment leaves image_url unchanged (custom admin image)';

-- Public bucket for artist main images (CDN via public URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'artist-images',
  'artist-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read artist images" on storage.objects;
create policy "Public can read artist images"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'artist-images');

drop policy if exists "Staff can upload artist images" on storage.objects;
create policy "Staff can upload artist images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'artist-images'
    and (select public.is_staff())
  );

drop policy if exists "Staff can update artist images" on storage.objects;
create policy "Staff can update artist images"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'artist-images'
    and (select public.is_staff())
  )
  with check (
    bucket_id = 'artist-images'
    and (select public.is_staff())
  );

drop policy if exists "Staff can delete artist images" on storage.objects;
create policy "Staff can delete artist images"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'artist-images'
    and (select public.is_staff())
  );
