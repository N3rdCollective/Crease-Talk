import { supabase } from './supabase/client'

export type ArtistRow = {
  id: string
  name: string
  spotify_id: string | null
  image_url: string | null
  genres: string[]
  followers: number
  spotify_url: string | null
  youtube_channel_id?: string | null
  is_verified?: boolean
  bio?: string | null
  is_featured: boolean
  display_order: number
}

export async function fetchFeaturedArtists(): Promise<ArtistRow[]> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      'id, name, spotify_id, image_url, genres, followers, spotify_url, is_verified, bio, is_featured, display_order',
    )
    .eq('is_featured', true)
    .order('display_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as ArtistRow[]
}

export async function fetchAllArtists(): Promise<ArtistRow[]> {
  const { data, error } = await supabase
    .from('artists')
    .select(
      'id, name, spotify_id, image_url, genres, followers, spotify_url, is_verified, bio, is_featured, display_order',
    )
    .order('followers', { ascending: false })

  if (error) throw error
  return (data ?? []) as ArtistRow[]
}

/** Call Edge Function to enrich featured artists from Spotify (server-side secrets). */
export async function syncFeaturedArtistsFromSpotify(force = false) {
  const { data, error } = await supabase.functions.invoke(
    'spotify-enrich-artist',
    {
      body: { syncFeatured: true, force },
    },
  )

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/** Fill empty artist bios from Last.fm (requires LASTFM_API_KEY secret). */
export async function syncArtistBiosFromLastFm(forceBio = false) {
  const { data, error } = await supabase.functions.invoke(
    'spotify-enrich-artist',
    {
      body: { syncBios: true, forceBio },
    },
  )

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as {
    synced: number
    filled: number
    results: Array<{ id: string; name: string; ok: boolean; bio?: string | null }>
  }
}

export type ArtistRelease = {
  id: string
  artist_id: string
  spotify_album_id: string
  name: string
  album_type: 'album' | 'single' | 'compilation' | 'appears_on'
  release_date: string | null
  total_tracks: number
  image_url: string | null
  spotify_url: string | null
}

/** Pull Spotify albums/singles into artist_releases for one or all artists. */
export async function syncArtistCatalogsFromSpotify(artistId?: string) {
  const { data, error } = await supabase.functions.invoke(
    'spotify-enrich-artist',
    {
      body: { syncCatalog: true, artistId },
    },
  )

  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as {
    synced: number
    releases: number
    results: Array<{
      id: string
      name: string
      ok: boolean
      releases?: number
      error?: string
    }>
  }
}

export async function fetchArtistReleases(
  artistId: string,
): Promise<ArtistRelease[]> {
  const { data, error } = await supabase
    .from('artist_releases')
    .select(
      'id, artist_id, spotify_album_id, name, album_type, release_date, total_tracks, image_url, spotify_url',
    )
    .eq('artist_id', artistId)
    .order('release_date', { ascending: false, nullsFirst: false })

  if (error) throw error
  return (data ?? []) as ArtistRelease[]
}

/** Search Spotify artists (no DB write) for admin correction UI. */
export async function searchSpotifyArtists(query: string, limit = 8) {
  const { data, error } = await supabase.functions.invoke(
    'spotify-enrich-artist',
    { body: { searchQuery: query, searchLimit: limit } },
  )
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

/** Force-link a CreaseTalk artist to a specific Spotify artist (ID or URL). */
export async function linkArtistToSpotify(options: {
  artistId: string
  spotifyId?: string
  spotifyUrl?: string
  keepName?: boolean
}) {
  const { data, error } = await supabase.functions.invoke(
    'spotify-enrich-artist',
    {
      body: {
        artistId: options.artistId,
        spotifyId: options.spotifyId,
        spotifyUrl: options.spotifyUrl,
        keepName: options.keepName ?? false,
      },
    },
  )
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
