import { useRef, useState } from 'react'
import {
  Maximize,
  Pause,
  Play,
  Volume2,
  VolumeX,
} from 'lucide-react'

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function Hero() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(30)

  const togglePlay = async () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      if (!video.src && !video.querySelector('source')) {
        const source = document.createElement('source')
        source.src =
          'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4'
        source.type = 'video/mp4'
        video.appendChild(source)
        video.load()
      }
      try {
        await video.play()
        setPlaying(true)
      } catch {
        setPlaying(false)
      }
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  const toggleMute = () => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setMuted(video.muted)
  }

  const toggleFullscreen = () => {
    const video = videoRef.current
    if (!video) return
    if (document.fullscreenElement) {
      void document.exitFullscreen()
    } else {
      void video.parentElement?.requestFullscreen()
    }
  }

  const onSeek = (value: number) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = value
    setCurrent(value)
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
          <video
            ref={videoRef}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
              playing ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            playsInline
            preload="none"
            onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
            onLoadedMetadata={(e) => {
              const d = e.currentTarget.duration
              setDuration(Number.isFinite(d) ? d : 30)
            }}
            onEnded={() => setPlaying(false)}
          />

          {!playing && (
            <button
              type="button"
              onClick={() => void togglePlay()}
              aria-label="Play featured video"
              className="absolute inset-0 z-10 flex items-center justify-center"
            >
              <span className="flex size-14 items-center justify-center rounded-full border border-white/50 bg-transparent transition-transform hover:scale-105 md:size-16">
                <Play className="ml-1 size-6 fill-white text-white md:size-7" strokeWidth={0} />
              </span>
            </button>
          )}

          <div className="absolute right-0 bottom-0 left-0 z-20 px-3 pt-8 pb-3">
            <div className="relative mb-2 h-[3px] w-full bg-white/30">
              <div
                className="absolute top-0 left-0 h-full bg-ct-orange"
                style={{
                  width: `${((current / (duration || 30)) * 100).toFixed(2)}%`,
                }}
              />
              <div
                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-ct-orange"
                style={{
                  left: `${((current / (duration || 30)) * 100).toFixed(2)}%`,
                }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={duration || 30}
              step={0.1}
              value={current}
              onChange={(e) => onSeek(Number(e.target.value))}
              className="absolute top-8 right-3 left-3 h-3 cursor-pointer opacity-0"
              aria-label="Seek"
            />
            <div className="flex items-center justify-between text-[11px] text-white/90">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => void togglePlay()}
                  aria-label={playing ? 'Pause' : 'Play'}
                  className="p-0.5"
                >
                  {playing ? (
                    <Pause className="size-4 fill-white" />
                  ) : (
                    <Play className="size-4 fill-white" />
                  )}
                </button>
                <span className="tabular-nums">
                  {formatTime(current)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={toggleMute}
                  aria-label={muted ? 'Unmute' : 'Mute'}
                  className="p-0.5"
                >
                  {muted ? (
                    <VolumeX className="size-4" />
                  ) : (
                    <Volume2 className="size-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  aria-label="Fullscreen"
                  className="p-0.5"
                >
                  <Maximize className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
