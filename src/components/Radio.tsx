import { Play } from 'lucide-react'

const bars = [
  18, 34, 22, 48, 28, 56, 36, 62, 30, 50, 24, 44, 58, 32, 46, 20, 54, 38, 60,
  26, 42, 52, 28, 48, 34, 56, 22, 40, 50, 30, 58, 36, 46, 24, 52, 32, 44, 60,
  28, 38,
]

export function Radio() {
  return (
    <section id="radio" className="border-y border-ct-border">
      <div className="grid lg:grid-cols-2">
        <div className="flex flex-col justify-center bg-black px-6 py-12 text-white md:px-12 md:py-16 lg:px-16">
          <h2 className="text-2xl font-extrabold tracking-tight uppercase md:text-3xl">
            CREASETALK RADIO
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/80 md:text-base">
            The hottest music. The realest interviews. Live and on demand.
          </p>
          <button
            type="button"
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-white px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase transition-opacity hover:opacity-90"
          >
            <Play className="size-4 fill-black" strokeWidth={0} />
            LISTEN NOW
          </button>
        </div>

        <div className="relative flex min-h-[220px] items-center bg-white px-6 py-12 md:px-10 md:py-16">
          <div className="absolute top-5 left-5 z-10 flex items-center gap-2 md:top-7 md:left-8">
            <span className="live-dot size-2.5 rounded-full bg-ct-orange" />
            <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase">
              LIVE NOW
            </span>
          </div>

          <div
            className="mt-6 flex h-24 w-full items-end gap-[3px] md:h-28 md:gap-1"
            aria-hidden="true"
          >
            {bars.map((height, index) => (
              <div
                key={index}
                className="flex-1 rounded-[1px] bg-[#d4d4d4]"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
