import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import {
  fetchChannelArtists,
  fetchChannelVideos,
  type ChannelArtist,
  type YouTubeVideo,
} from '../lib/youtube'

export function NewArtistsPage() {
  const [artists, setArtists] = useState<ChannelArtist[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false
    window.scrollTo(0, 0)

    fetchChannelArtists({ maxResults: 50 })
      .then((items) => {
        if (!cancelled) setArtists(items)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load artists')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const playArtist = async (artist: ChannelArtist) => {
    try {
      const videos = await fetchChannelVideos({ maxResults: 50 })
      const match = videos.find((v) => v.id === artist.latestVideoId)
      if (match) setActiveVideo(match)
    } catch {
      // ignore play failures
    }
  }

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <PageHeader
          title="NEW ARTISTS"
          description="Fresh talent breaking through right now — pulled from recent CreaseTalk features."
        />

        {loading && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="aspect-square w-full animate-pulse rounded-full bg-[#f3f3f3]" />
                <div className="mt-4 h-4 w-24 animate-pulse bg-[#f3f3f3]" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-black/60">{error}</p>
        )}

        {!loading && !error && artists.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {artists.map((artist) => (
              <button
                key={artist.name}
                type="button"
                onClick={() => void playArtist(artist)}
                className="group flex flex-col items-center text-center"
              >
                <div className="aspect-square w-full overflow-hidden rounded-full border border-ct-border bg-[#f3f3f3] transition-colors group-hover:border-black">
                  {artist.thumbnail && (
                    <img
                      src={artist.thumbnail}
                      alt={artist.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <h3 className="mt-4 text-sm font-extrabold tracking-tight uppercase">
                  {artist.name}
                </h3>
                <p className="mt-1 text-xs text-black/60">
                  {artist.videoCount}{' '}
                  {artist.videoCount === 1 ? 'video' : 'videos'}
                </p>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && artists.length === 0 && (
          <p className="text-sm text-black/60">No artists found yet.</p>
        )}
      </div>

      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  )
}
