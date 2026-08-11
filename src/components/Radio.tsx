import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'

/** Temporary stream until CreaseTalk has its own radio server */
const RADIO_STREAM_URL = 'https://s3.radio.co/s1a36378a0/listen'

const bars = [
  18, 34, 22, 48, 28, 56, 36, 62, 30, 50, 24, 44, 58, 32, 46, 20, 54, 38, 60,
  26, 42, 52, 28, 48, 34, 56, 22, 40, 50, 30, 58, 36, 46, 24, 52, 32, 44, 60,
  28, 38,
]

export function Radio() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const audio = new Audio(RADIO_STREAM_URL)
    audio.preload = 'none'
    audioRef.current = audio

    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onError = () => {
      setPlaying(false)
      setError('Stream unavailable right now. Try again in a moment.')
    }

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('error', onError)

    return () => {
      audio.pause()
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audioRef.current = null
    }
  }, [])

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    setError(null)

    try {
      if (!audio.paused) {
        audio.pause()
        return
      }
      // Live streams: reload before play so listeners join current broadcast
      audio.src = RADIO_STREAM_URL
      await audio.play()
    } catch {
      setPlaying(false)
      setError('Could not start the stream. Check your connection and retry.')
    }
  }

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
            onClick={() => void toggle()}
            className="mt-8 inline-flex w-fit items-center gap-2 rounded-md bg-white px-6 py-3 text-xs font-extrabold tracking-wider text-black uppercase transition-opacity hover:opacity-90"
          >
            {playing ? (
              <Pause className="size-4 fill-black" strokeWidth={0} />
            ) : (
              <Play className="size-4 fill-black" strokeWidth={0} />
            )}
            {playing ? 'PAUSE' : 'LISTEN NOW'}
          </button>
          {error && (
            <p className="mt-3 max-w-md text-xs text-red-300">{error}</p>
          )}
        </div>

        <div className="relative flex min-h-[220px] items-center bg-white px-6 py-12 md:px-10 md:py-16">
          <div className="absolute top-5 left-5 z-10 flex items-center gap-2 md:top-7 md:left-8">
            <span
              className={`size-2.5 rounded-full bg-ct-orange ${
                playing ? 'live-dot' : ''
              }`}
            />
            <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase">
              {playing ? 'LIVE NOW' : 'ON AIR'}
            </span>
          </div>

          <div
            className="mt-6 flex h-24 w-full items-end gap-[3px] md:h-28 md:gap-1"
            aria-hidden="true"
          >
            {bars.map((height, index) => (
              <div
                key={index}
                className={`flex-1 rounded-[1px] ${
                  playing ? 'bg-ct-orange/70' : 'bg-[#d4d4d4]'
                }`}
                style={{
                  height: `${height}%`,
                  transition: 'background-color 200ms ease',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
