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
      'id, name, spotify_id, image_url, genres, followers, spotify_url, is_featured, display_order',
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
      'id, name, spotify_id, image_url, genres, followers, spotify_url, is_featured, display_order',
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
  return data
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
        keepName: options.keepName ?? true,
      },
    },
  )
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}
