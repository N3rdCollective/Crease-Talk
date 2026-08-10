import { useEffect, useState } from 'react'
import { Maximize, Play } from 'lucide-react'
import {
  fetchLatestChannelVideo,
  youtubeEmbedUrl,
  type YouTubeVideo,
} from '../lib/youtube'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Hero() {
  const [video, setVideo] = useState<YouTubeVideo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchLatestChannelVideo()
      .then((latest) => {
        if (!cancelled) setVideo(latest)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load video')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const openFullscreen = () => {
    if (!video) return
    window.open(`https://www.youtube.com/watch?v=${video.id}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <section id="home" className="bg-black text-white">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 md:px-8 md:py-20 lg:grid-cols-2 lg:gap-12 lg:py-24">
        <div className="max-w-xl">
          <p className="text-xs font-semibold tracking-[0.2em] text-ct-orange uppercase md:text-sm">
            WELCOME TO
          </p>
          <h1 className="mt-3 text-5xl leading-none font-black tracking-tighter uppercase sm:text-6xl md:text-7xl lg:text-[5.25rem]">
            CREASETALK
          </h1>
          <div className="mt-6 max-w-md">
            <p className="text-sm font-semibold tracking-wide uppercase md:text-base">
              MEDIA + ARTIST DISCOVERY PLATFORM
            </p>
            <div className="mt-3 h-[2px] w-16 bg-ct-orange" />
            <p className="mt-3 text-sm font-medium tracking-wide text-white/85 uppercase md:text-base">
              BREAKING THE NEXT WAVE OF ARTISTS.
            </p>
          </div>

          <div id="submit" className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="#artists"
              className="inline-flex items-center justify-center rounded-md bg-white px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase transition-opacity hover:opacity-90"
            >
              DISCOVER ARTISTS →
            </a>
            <a
              href="#submit"
              className="inline-flex items-center justify-center rounded-md border border-white px-6 py-3 text-xs font-extrabold tracking-wider text-white uppercase transition-colors hover:bg-white hover:text-black"
            >
              SUBMIT MUSIC →
            </a>
          </div>
        </div>

        <div className="relative aspect-video w-full overflow-hidden border border-white/15 bg-[#1a1a1a]">
          {playing && video ? (
            <iframe
              title={video.title}
              src={youtubeEmbedUrl(video.id, true)}
              className="absolute inset-0 h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <>
              {video?.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              )}

              <div className="absolute inset-0 bg-black/25" />

              <button
                type="button"
                onClick={() => video && setPlaying(true)}
                disabled={!video || loading}
                aria-label={video ? `Play ${video.title}` : 'Play featured video'}
                className="absolute inset-0 z-10 flex items-center justify-center disabled:cursor-wait"
              >
                <span className="flex size-14 items-center justify-center rounded-full border border-white/50 bg-black/30 backdrop-blur-sm transition-transform hover:scale-105 md:size-16">
                  <Play className="ml-1 size-6 fill-white text-white md:size-7" strokeWidth={0} />
                </span>
              </button>

              <div className="absolute right-0 bottom-0 left-0 z-20 px-3 pt-8 pb-3">
                {video && (
                  <p className="mb-2 line-clamp-1 text-[11px] font-semibold tracking-wide text-white/90 uppercase">
                    {video.title}
                  </p>
                )}
                <div className="relative mb-2 h-[3px] w-full bg-white/30">
                  <div className="absolute top-1/2 left-0 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ct-orange" />
                </div>
                <div className="flex items-center justify-between text-[11px] text-white/90">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => video && setPlaying(true)}
                      disabled={!video || loading}
                      aria-label="Play"
                      className="p-0.5 disabled:opacity-50"
                    >
                      <Play className="size-4 fill-white" />
                    </button>
                    <span className="tabular-nums">
                      0:00 / {formatTime(video?.durationSeconds ?? 0)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={openFullscreen}
                    disabled={!video}
                    aria-label="Watch on YouTube"
                    className="p-0.5 disabled:opacity-50"
                  >
                    <Maximize className="size-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1a1a1a] text-xs tracking-widest text-white/60 uppercase">
              Loading latest video…
            </div>
          )}

          {error && !loading && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#1a1a1a] px-6 text-center text-xs text-white/70">
              {error}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
