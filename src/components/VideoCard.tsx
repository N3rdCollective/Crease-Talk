import { Play } from 'lucide-react'
import type { VideoItem } from '../data/content'

type VideoCardProps = {
  item: VideoItem
  variant?: 'compact' | 'wide'
}

export function VideoCard({ item, variant = 'compact' }: VideoCardProps) {
  const isInterview = item.type === 'INTERVIEW'

  return (
    <article
      className={`group border border-ct-border bg-white ${
        variant === 'wide'
          ? 'w-[280px] shrink-0 snap-start sm:w-[300px] md:w-auto md:shrink'
          : 'w-[240px] shrink-0 snap-start sm:w-[260px]'
      }`}
    >
      <div className="relative aspect-[4/3] border-b border-ct-border bg-[#f5f5f5]">
        <span className="absolute top-3 left-3 z-10 bg-black px-2 py-1 text-[10px] font-bold tracking-wider text-white uppercase">
          {item.type}
        </span>
        <button
          type="button"
          aria-label={`Play ${item.title}`}
          className="absolute inset-0 flex items-center justify-center"
        >
          <span className="flex size-12 items-center justify-center rounded-full border border-black/20 bg-white/90 transition-transform group-hover:scale-105">
            <Play className="ml-0.5 size-5 fill-black text-black" strokeWidth={0} />
          </span>
        </button>
      </div>

      <div className="flex flex-col gap-1 p-4">
        {isInterview ? (
          <h3 className="text-sm leading-snug font-extrabold tracking-tight uppercase">
            {item.title}
          </h3>
        ) : (
          <>
            <h3 className="text-sm font-extrabold tracking-tight uppercase">
              {item.artist}
            </h3>
            <p className="text-sm text-black/70">{item.title}</p>
          </>
        )}
        <a
          href={`#${item.id}`}
          className="mt-3 inline-flex text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
        >
          WATCH NOW →
        </a>
      </div>
    </article>
  )
}
