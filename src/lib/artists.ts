import { supabase } from './supabase/client'

export type ArtistRow = {
  id: string
  name: string
  spotify_id: string | null
  image_url: string | null
  genres: string[]
  followers: number
  spotify_url: string | null
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
