import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { VideoCard } from '../components/VideoCard'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import { fetchChannelVideos, type YouTubeVideo } from '../lib/youtube'

export function VideosPage() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false
    window.scrollTo(0, 0)

    fetchChannelVideos({ maxResults: 50, skip: 0 })
      .then((items) => {
        if (!cancelled) setVideos(items)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load videos')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Link
          to="/#latest"
          className="mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
        >
          <ArrowLeft className="size-4" strokeWidth={2} />
          Back
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight uppercase md:text-4xl">
            THE LATEST
          </h1>
          <div className="mt-2 h-[3px] w-12 bg-ct-orange" />
          <p className="mt-4 max-w-xl text-sm text-black/65 md:text-base">
            All CreaseTalk videos — performances, drops, and more.
          </p>
        </div>

        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-[280px] animate-pulse border border-ct-border bg-[#f5f5f5]"
              />
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-black/60">{error}</p>
        )}

        {!loading && !error && videos.length > 0 && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-5">
            {videos.map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                layout="grid"
                onPlay={setActiveVideo}
              />
            ))}
          </div>
        )}

        {!loading && !error && videos.length === 0 && (
          <p className="text-sm text-black/60">No videos yet.</p>
        )}
      </div>

      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  )
}
