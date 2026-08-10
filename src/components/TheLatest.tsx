import { useEffect, useState } from 'react'
import { Carousel } from './Carousel'
import { SectionHeader } from './SectionHeader'
import { VideoCard } from './VideoCard'
import { fetchChannelVideos, type YouTubeVideo } from '../lib/youtube'

export function TheLatest() {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchChannelVideos({ maxResults: 24, skip: 1 })
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
    <section id="latest" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader
          title="THE LATEST"
          href="https://www.youtube.com/@creasetalk"
          linkLabel="VIEW ALL →"
        />

        {loading && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5">
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
          <Carousel ariaLabel="Latest videos">
            {videos.map((item) => (
              <VideoCard key={item.id} item={item} />
            ))}
          </Carousel>
        )}

        {!loading && !error && videos.length === 0 && (
          <p className="text-sm text-black/60">No more videos yet.</p>
        )}
      </div>
    </section>
  )
}
