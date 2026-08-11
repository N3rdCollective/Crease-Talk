-- Extend music submissions for A&R pipeline (genre, socials, cover art)

alter table public.music_submissions
  add column if not exists genre text,
  add column if not exists instagram_url text,
  add column if not exists spotify_url text,
  add column if not exists cover_file_path text,
  add column if not exists cover_file_url text;

-- Allow cover images in music-submissions bucket
update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/mp4',
  'audio/m4a', 'audio/aac', 'audio/flac', 'audio/ogg',
  'image/jpeg', 'image/png', 'image/webp'
]
where id = 'music-submissions';

comment on column public.music_submissions.genre is 'Submitted genre label from public form';
comment on column public.music_submissions.cover_file_path is 'Cover art path in music-submissions storage bucket';
