import { useEffect, useState } from 'react'
import { SectionHeader } from './SectionHeader'
import { VideoCard } from './VideoCard'
import { VideoPlayerModal } from './VideoPlayerModal'
import { fetchChannelVideos, type YouTubeVideo } from '../lib/youtube'

function shuffle<T>(items: T[]): T[] {
  const next = [...items]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function LatestInterviews() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false

    // Placeholder until real interviews exist: random channel videos
    fetchChannelVideos({ maxResults: 24, skip: 0 })
      .then((items) => {
        if (cancelled) return
        setVideos(shuffle(items).slice(0, 4))
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
    <section id="interviews" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader
          title="LATEST INTERVIEWS"
          href="https://www.youtube.com/@creasetalk"
        />

        {loading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
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
          <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4 lg:gap-5">
            {videos.map((item) => (
              <VideoCard
                key={item.id}
                item={item}
                variant="wide"
                badge="INTERVIEW"
                onPlay={setActiveVideo}
              />
            ))}
          </div>
        )}
      </div>

      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  )
}
