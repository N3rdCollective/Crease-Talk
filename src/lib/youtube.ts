export type YouTubeVideo = {
  id: string
  title: string
  artist: string
  thumbnail: string
  publishedAt: string
  durationSeconds: number
  viewCount: number
  watchUrl: string
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
  if (!match) return 0
  const hours = Number(match[1] ?? 0)
  const minutes = Number(match[2] ?? 0)
  const seconds = Number(match[3] ?? 0)
  return hours * 3600 + minutes * 60 + seconds
}

function pickThumbnail(
  thumbnails?: Record<string, { url?: string }>,
): string {
  return (
    thumbnails?.maxres?.url ||
    thumbnails?.standard?.url ||
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ''
  )
}

/** Pull artist + track from titles like: Nina Woods "It Like That" Crease Talk Performance */
function parseVideoTitle(rawTitle: string): { artist: string; title: string } {
  const quoted = rawTitle.match(/^(.+?)\s+[“"](.+?)[”"]/)
  if (quoted) {
    return {
      artist: quoted[1].trim().toUpperCase(),
      title: quoted[2].trim(),
    }
  }

  const cleaned = rawTitle
    .replace(/\s*[-|–]\s*Crease\s*Talk.*$/i, '')
    .replace(/\s*Crease\s*Talk\s*(Performance|Interview)?.*$/i, '')
    .trim()

  return {
    artist: 'CREASE TALK',
    title: cleaned || rawTitle,
  }
}

async function youtubeGet<T>(
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY
  if (!key) throw new Error('Missing VITE_YOUTUBE_API_KEY')

  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  url.searchParams.set('key', key)

  const res = await fetch(url)
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`YouTube API error (${res.status}): ${body}`)
  }
  return res.json() as Promise<T>
}

type ChannelListResponse = {
  items?: Array<{
    id: string
    contentDetails?: { relatedPlaylists?: { uploads?: string } }
  }>
}

type PlaylistItemsResponse = {
  items?: Array<{
    contentDetails?: { videoId?: string; videoPublishedAt?: string }
    snippet?: {
      title?: string
      publishedAt?: string
      thumbnails?: Record<string, { url?: string }>
    }
  }>
}

type VideosResponse = {
  items?: Array<{
    id: string
    snippet?: {
      title?: string
      publishedAt?: string
      thumbnails?: Record<string, { url?: string }>
    }
    contentDetails?: { duration?: string }
    statistics?: { viewCount?: string }
  }>
}

async function getUploadsPlaylistId(handle: string): Promise<string> {
  const cleanHandle = handle.replace(/^@/, '')
  const channels = await youtubeGet<ChannelListResponse>('channels', {
    part: 'contentDetails',
    forHandle: cleanHandle,
  })

  const uploadsId = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
  if (!uploadsId) {
    throw new Error(`No uploads playlist found for @${cleanHandle}`)
  }
  return uploadsId
}

function toYouTubeVideo(
  video: NonNullable<VideosResponse['items']>[number],
  fallback?: PlaylistItemsResponse['items'] extends (infer I)[] | undefined
    ? I
    : never,
): YouTubeVideo {
  const rawTitle =
    video.snippet?.title || fallback?.snippet?.title || 'Featured video'
  const { artist, title } = parseVideoTitle(rawTitle)

  return {
    id: video.id,
    artist,
    title,
    thumbnail:
      pickThumbnail(video.snippet?.thumbnails) ||
      pickThumbnail(fallback?.snippet?.thumbnails),
    publishedAt:
      fallback?.contentDetails?.videoPublishedAt ||
      video.snippet?.publishedAt ||
      fallback?.snippet?.publishedAt ||
      '',
    durationSeconds: parseIsoDuration(video.contentDetails?.duration || ''),
    viewCount: Number(video.statistics?.viewCount || 0),
    watchUrl: `https://www.youtube.com/watch?v=${video.id}`,
  }
}

/**
 * Prefer approved Supabase media_assets; fall back to live YouTube API
 * when the catalog is empty (cutover safety).
 */
export async function fetchChannelVideos(
  options: {
    handle?: string
    maxResults?: number
    /** Skip the newest N videos (e.g. 1 when hero already shows the latest) */
    skip?: number
    sortBy?: 'date' | 'views'
    category?: 'performance' | 'interview' | 'other'
  } = {},
): Promise<YouTubeVideo[]> {
  try {
    const { fetchApprovedVideosAsYouTube } = await import('./media')
    const fromDb = await fetchApprovedVideosAsYouTube({
      limit: options.maxResults,
      skip: options.skip,
      sortBy: options.sortBy,
      category: options.category,
    })
    if (fromDb.length > 0) return fromDb
  } catch (err) {
    console.warn('media_assets fetch failed, falling back to YouTube API', err)
  }

  return fetchChannelVideosFromApi(options)
}

async function fetchChannelVideosFromApi(
  options: {
    handle?: string
    maxResults?: number
    skip?: number
    sortBy?: 'date' | 'views'
  } = {},
): Promise<YouTubeVideo[]> {
  const handle =
    options.handle || import.meta.env.VITE_YOUTUBE_CHANNEL_HANDLE || 'creasetalk'
  const maxResults = Math.min(Math.max(options.maxResults ?? 12, 1), 50)
  const skip = Math.max(options.skip ?? 0, 0)
  const fetchCount = Math.min(maxResults + skip, 50)

  const uploadsId = await getUploadsPlaylistId(handle)

  const playlist = await youtubeGet<PlaylistItemsResponse>('playlistItems', {
    part: 'snippet,contentDetails',
    playlistId: uploadsId,
    maxResults: String(fetchCount),
  })

  const items = (playlist.items || []).slice(skip)
  const ids = items
    .map((item) => item.contentDetails?.videoId)
    .filter((id): id is string => Boolean(id))

  if (ids.length === 0) return []

  const videos = await youtubeGet<VideosResponse>('videos', {
    part: 'snippet,contentDetails,statistics',
    id: ids.join(','),
  })

  const byId = new Map((videos.items || []).map((v) => [v.id, v]))

  const mapped = items
    .map((item) => {
      const id = item.contentDetails?.videoId
      if (!id) return null
      const video = byId.get(id)
      if (!video) return null
      return toYouTubeVideo(video, item)
    })
    .filter((v): v is YouTubeVideo => v !== null)

  if (options.sortBy === 'views') {
    return [...mapped].sort((a, b) => b.viewCount - a.viewCount)
  }

  return mapped
}

export async function fetchLatestChannelVideo(
  handle = import.meta.env.VITE_YOUTUBE_CHANNEL_HANDLE || 'creasetalk',
): Promise<YouTubeVideo> {
  const [latest] = await fetchChannelVideos({ handle, maxResults: 1, skip: 0 })
  if (!latest) throw new Error('No videos found on channel')
  return latest
}

export type ChannelArtist = {
  name: string
  thumbnail: string
  videoCount: number
  latestVideoId: string
}

/** Unique artists derived from recent channel uploads */
export async function fetchChannelArtists(
  options: { handle?: string; maxResults?: number } = {},
): Promise<ChannelArtist[]> {
  const videos = await fetchChannelVideos({
    handle: options.handle,
    maxResults: options.maxResults ?? 50,
    skip: 0,
  })

  const byArtist = new Map<string, ChannelArtist>()

  for (const video of videos) {
    if (!video.artist || video.artist === 'CREASE TALK') continue
    const existing = byArtist.get(video.artist)
    if (!existing) {
      byArtist.set(video.artist, {
        name: video.artist,
        thumbnail: video.thumbnail,
        videoCount: 1,
        latestVideoId: video.id,
      })
    } else {
      existing.videoCount += 1
    }
  }

  return [...byArtist.values()]
}

export function youtubeEmbedUrl(videoId: string, autoplay = false) {
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
    autoplay: autoplay ? '1' : '0',
  })
  if (typeof window !== 'undefined') {
    params.set('origin', window.location.origin)
  }
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

export function formatViewCount(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}
