-- Cached Spotify discography (albums / singles / compilations) per artist

create table if not exists public.artist_releases (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists (id) on delete cascade,
  spotify_album_id text not null,
  name text not null,
  album_type text not null default 'album'
    check (album_type in ('album', 'single', 'compilation', 'appears_on')),
  release_date text,
  release_date_precision text,
  total_tracks integer not null default 0,
  image_url text,
  spotify_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (artist_id, spotify_album_id)
);

create index if not exists artist_releases_artist_date_idx
  on public.artist_releases (artist_id, release_date desc nulls last);

create index if not exists artist_releases_spotify_album_id_idx
  on public.artist_releases (spotify_album_id);

alter table public.artist_releases enable row level security;

drop policy if exists "Public can read artist releases" on public.artist_releases;
create policy "Public can read artist releases"
  on public.artist_releases
  for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff can manage artist releases" on public.artist_releases;
create policy "Staff can manage artist releases"
  on public.artist_releases
  for all
  to authenticated
  using ((select public.is_staff()))
  with check ((select public.is_staff()));

grant select on public.artist_releases to anon, authenticated;
grant insert, update, delete on public.artist_releases to authenticated;

drop trigger if exists artist_releases_set_updated_at on public.artist_releases;
create trigger artist_releases_set_updated_at
  before update on public.artist_releases
  for each row execute function public.set_updated_at();

comment on table public.artist_releases is
  'Spotify discography cache; synced via spotify-enrich-artist syncCatalog';
