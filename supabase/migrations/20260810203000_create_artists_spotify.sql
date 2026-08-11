-- Artists catalog enriched via Spotify Web API (Crease-Talk project)
create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  spotify_id text unique,
  image_url text,
  genres text[] not null default '{}'::text[],
  followers integer not null default 0,
  spotify_url text,
  is_featured boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artists_featured_order_idx
  on public.artists (is_featured, display_order)
  where is_featured = true;

create index if not exists artists_name_idx
  on public.artists (lower(name));

alter table public.artists enable row level security;

drop policy if exists "Public can read artists" on public.artists;
create policy "Public can read artists"
  on public.artists
  for select
  to anon, authenticated
  using (true);

comment on table public.artists is 'Artist catalog; Spotify fields enriched via spotify-enrich-artist Edge Function';
comment on column public.artists.spotify_id is 'Permanent Spotify catalog ID from search match';

-- Seed featured placeholders if table is empty
insert into public.artists (name, is_featured, display_order)
select * from (
  values
    ('J Stone', true, 1),
    ('Nina Woods', true, 2),
    ('Suzi', true, 3),
    ('Young Devyn', true, 4),
    ('AP Rulla', true, 5),
    ('Cruch Calhoun', true, 6),
    ('Monique The Star', true, 7),
    ('Kai Rivers', true, 8)
) as v(name, is_featured, display_order)
where not exists (select 1 from public.artists limit 1);
