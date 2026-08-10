import { useRef, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type CarouselProps = {
  children: ReactNode
  ariaLabel: string
}

export function Carousel({ children, ariaLabel }: CarouselProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)

  const scrollByCard = (direction: -1 | 1) => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.min(el.clientWidth * 0.8, 360)
    el.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  return (
    <div className="relative md:px-8">
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollByCard(-1)}
        className="absolute top-1/2 left-0 z-10 hidden -translate-y-1/2 items-center justify-center text-black/70 transition-colors hover:text-black md:flex"
      >
        <ChevronLeft className="size-6" strokeWidth={1.5} />
      </button>

      <div
        ref={scrollerRef}
        aria-label={ariaLabel}
        className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto py-1 scroll-smooth md:gap-5"
      >
        {children}
      </div>

      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollByCard(1)}
        className="absolute top-1/2 right-0 z-10 hidden -translate-y-1/2 items-center justify-center text-black/70 transition-colors hover:text-black md:flex"
      >
        <ChevronRight className="size-6" strokeWidth={1.5} />
      </button>
    </div>
  )
}
