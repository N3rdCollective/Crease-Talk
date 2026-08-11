import { useEffect } from 'react'
import { X } from 'lucide-react'
import { youtubeEmbedUrl, type YouTubeVideo } from '../lib/youtube'

type VideoPlayerModalProps = {
  video: YouTubeVideo | null
  onClose: () => void
}

export function VideoPlayerModal({ video, onClose }: VideoPlayerModalProps) {
  useEffect(() => {
    if (!video) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [video, onClose])

  if (!video) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={video.title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl border border-white/20 bg-black shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-5">
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold tracking-wide text-white uppercase">
              {video.artist}
            </p>
            <p className="truncate text-sm text-white/75">{video.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close video"
            className="shrink-0 p-1 text-white/80 transition-colors hover:text-white"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="relative aspect-video w-full bg-black">
          <iframe
            title={video.title}
            src={youtubeEmbedUrl(video.id, true)}
            className="absolute inset-0 h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}
