import { useEffect, useState } from 'react'
import { PageHeader } from './PageHeader'
import { VideoCard } from './VideoCard'
import { VideoPlayerModal } from './VideoPlayerModal'
import {
  fetchChannelVideos,
  formatViewCount,
  type YouTubeVideo,
} from '../lib/youtube'

type VideoGridPageProps = {
  title: string
  description: string
  sortBy?: 'date' | 'views'
  showViews?: boolean
  backTo?: string
}

export function VideoGridPage({
  title,
  description,
  sortBy = 'date',
  showViews = false,
  backTo = '/#discover',
}: VideoGridPageProps) {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    let cancelled = false
    window.scrollTo(0, 0)

    fetchChannelVideos({ maxResults: 50, skip: 0, sortBy })
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
  }, [sortBy])

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <PageHeader title={title} description={description} backTo={backTo} />

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
            {videos.map((item, index) => (
              <div key={item.id} className="flex flex-col">
                {showViews && (
                  <div className="mb-2 flex items-center justify-between text-[10px] font-bold tracking-wider text-black/50 uppercase">
                    <span>#{index + 1}</span>
                    <span>{formatViewCount(item.viewCount)} views</span>
                  </div>
                )}
                <VideoCard
                  item={item}
                  layout="grid"
                  onPlay={setActiveVideo}
                />
              </div>
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
