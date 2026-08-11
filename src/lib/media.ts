import { supabase } from './supabase/client'
import type { YouTubeVideo } from './youtube'

export type MediaAsset = {
  id: string
  artist_id: string | null
  youtube_video_id: string | null
  title: string
  parsed_artist_name: string | null
  thumbnail_url: string | null
  published_at: string | null
  duration_seconds: number
  view_count: number
  category: 'performance' | 'interview' | 'other'
  approval_status: 'pending' | 'approved' | 'rejected'
  is_featured: boolean
  submission_id: string | null
  created_at: string
  updated_at: string
}

const MEDIA_SELECT =
  'id, artist_id, youtube_video_id, title, parsed_artist_name, thumbnail_url, published_at, duration_seconds, view_count, category, approval_status, is_featured, submission_id, created_at, updated_at'

export function mediaToYouTubeVideo(row: MediaAsset): YouTubeVideo | null {
  if (!row.youtube_video_id) return null
  return {
    id: row.youtube_video_id,
    title: row.title,
    artist: (row.parsed_artist_name || 'CREASE TALK').toUpperCase(),
    thumbnail: row.thumbnail_url || '',
    publishedAt: row.published_at || '',
    durationSeconds: row.duration_seconds,
    viewCount: row.view_count,
    watchUrl: `https://www.youtube.com/watch?v=${row.youtube_video_id}`,
  }
}

export async function fetchApprovedMedia(options: {
  limit?: number
  skip?: number
  sortBy?: 'date' | 'views'
  category?: MediaAsset['category']
} = {}): Promise<MediaAsset[]> {
  const limit = options.limit ?? 24
  const skip = options.skip ?? 0

  let query = supabase
    .from('media_assets')
    .select(MEDIA_SELECT)
    .eq('approval_status', 'approved')
    .not('youtube_video_id', 'is', null)

  if (options.category) {
    query = query.eq('category', options.category)
  }

  if (options.sortBy === 'views') {
    query = query.order('view_count', { ascending: false })
  } else {
    query = query.order('published_at', { ascending: false, nullsFirst: false })
  }

  query = query.range(skip, skip + limit - 1)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as MediaAsset[]
}

export async function fetchApprovedVideosAsYouTube(options: {
  limit?: number
  skip?: number
  sortBy?: 'date' | 'views'
  category?: MediaAsset['category']
} = {}): Promise<YouTubeVideo[]> {
  const rows = await fetchApprovedMedia(options)
  return rows
    .map(mediaToYouTubeVideo)
    .filter((v): v is YouTubeVideo => v !== null)
}

export async function fetchAllMediaForAdmin(status?: MediaAsset['approval_status']) {
  let query = supabase
    .from('media_assets')
    .select(MEDIA_SELECT)
    .order('published_at', { ascending: false, nullsFirst: false })

  if (status) query = query.eq('approval_status', status)

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as MediaAsset[]
}

export async function updateMediaAsset(
  id: string,
  patch: {
    title?: string
    parsed_artist_name?: string | null
    artist_id?: string | null
    category?: MediaAsset['category']
    approval_status?: MediaAsset['approval_status']
    is_featured?: boolean
  },
) {
  const { data, error } = await supabase
    .from('media_assets')
    .update(patch)
    .eq('id', id)
    .select(MEDIA_SELECT)
    .single()
  if (error) throw error
  return data as MediaAsset
}

export async function batchUpdateMediaStatus(
  ids: string[],
  approval_status: MediaAsset['approval_status'],
) {
  const { error } = await supabase
    .from('media_assets')
    .update({ approval_status })
    .in('id', ids)
  if (error) throw error
}

export async function runYouTubeIngest() {
  const { data, error } = await supabase.functions.invoke('youtube-ingest', {
    body: { maxResults: 50 },
  })
  if (error) throw error
  return data
}
