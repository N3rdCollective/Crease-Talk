import { useEffect, useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../lib/supabase/client'

const AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/mp4',
  'audio/m4a',
  'audio/aac',
  'audio/flac',
  'audio/ogg',
]
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Props = {
  open: boolean
  onClose: () => void
}

export function SubmitMusicModal({ open, onClose }: Props) {
  const [artistName, setArtistName] = useState('')
  const [trackTitle, setTrackTitle] = useState('')
  const [email, setEmail] = useState('')
  const [genre, setGenre] = useState('')
  const [instagramUrl, setInstagramUrl] = useState('')
  const [spotifyUrl, setSpotifyUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [audio, setAudio] = useState<File | null>(null)
  const [cover, setCover] = useState<File | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setDone(false)

    if (!audio) {
      setError('Audio file (MP3/WAV) is required.')
      return
    }
    if (!AUDIO_TYPES.includes(audio.type) && !/\.(mp3|wav|m4a|aac|flac|ogg)$/i.test(audio.name)) {
      setError('Audio must be MP3 or WAV (or another supported audio type).')
      return
    }
    if (cover && !IMAGE_TYPES.includes(cover.type)) {
      setError('Cover art must be JPG or PNG.')
      return
    }

    setBusy(true)
    try {
      const id = crypto.randomUUID()
      const audioExt = audio.name.split('.').pop() || 'mp3'
      const audioPath = `audio/${id}.${audioExt}`

      setProgress('Uploading audio…')
      const { error: audioErr } = await supabase.storage
        .from('music-submissions')
        .upload(audioPath, audio, {
          contentType: audio.type || 'audio/mpeg',
          upsert: false,
        })
      if (audioErr) throw audioErr

      let coverPath: string | null = null
      if (cover) {
        const coverExt = cover.name.split('.').pop() || 'jpg'
        coverPath = `covers/${id}.${coverExt}`
        setProgress('Uploading cover art…')
        const { error: coverErr } = await supabase.storage
          .from('music-submissions')
          .upload(coverPath, cover, {
            contentType: cover.type || 'image/jpeg',
            upsert: false,
          })
        if (coverErr) throw coverErr
      }

      setProgress('Saving submission…')
      const { error: insertErr } = await supabase.from('music_submissions').insert({
        artist_name: artistName.trim(),
        track_title: trackTitle.trim(),
        contact_email: email.trim(),
        genre: genre.trim() || null,
        instagram_url: instagramUrl.trim() || null,
        spotify_url: spotifyUrl.trim() || null,
        notes: notes.trim() || null,
        audio_file_path: audioPath,
        cover_file_path: coverPath,
        status: 'pending',
      })
      if (insertErr) throw insertErr

      setProgress(null)
      setArtistName('')
      setTrackTitle('')
      setEmail('')
      setGenre('')
      setInstagramUrl('')
      setSpotifyUrl('')
      setNotes('')
      setAudio(null)
      setCover(null)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed')
      setProgress(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-music-title"
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto bg-white"
      >
        <div className="flex items-start justify-between border-b border-ct-border px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ct-orange uppercase">
              A&R pipeline
            </p>
            <h2
              id="submit-music-title"
              className="mt-1 text-xl font-black tracking-tight uppercase"
            >
              Submit music
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-black/50 hover:text-black"
          >
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 px-5 py-8">
            <p className="text-sm text-black/80">
              Submission received. CreaseTalk A&R will review your track.
            </p>
            <button
              type="button"
              onClick={() => {
                setDone(false)
                onClose()
              }}
              className="bg-black px-5 py-2.5 text-xs font-extrabold tracking-wider text-white uppercase"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3 px-5 py-5">
            <label className="block text-xs font-bold uppercase">
              Artist name *
              <input
                required
                value={artistName}
                onChange={(e) => setArtistName(e.target.value)}
                className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <label className="block text-xs font-bold uppercase">
              Song title *
              <input
                required
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <label className="block text-xs font-bold uppercase">
              Contact email *
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <label className="block text-xs font-bold uppercase">
              Genre
              <input
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Hip-Hop, R&B, Afrobeats…"
                className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-bold uppercase">
                Instagram
                <input
                  value={instagramUrl}
                  onChange={(e) => setInstagramUrl(e.target.value)}
                  placeholder="https://instagram.com/…"
                  className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
                />
              </label>
              <label className="block text-xs font-bold uppercase">
                Spotify
                <input
                  value={spotifyUrl}
                  onChange={(e) => setSpotifyUrl(e.target.value)}
                  placeholder="https://open.spotify.com/…"
                  className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
                />
              </label>
            </div>
            <label className="block text-xs font-bold uppercase">
              Notes
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
              />
            </label>
            <label className="block text-xs font-bold uppercase">
              Audio (MP3/WAV) *
              <input
                required
                type="file"
                accept=".mp3,.wav,.m4a,.aac,.flac,.ogg,audio/*"
                onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm font-normal normal-case"
              />
            </label>
            <label className="block text-xs font-bold uppercase">
              Cover art (JPG/PNG)
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setCover(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm font-normal normal-case"
              />
            </label>

            {progress && (
              <p className="text-sm text-black/60">{progress}</p>
            )}
            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={busy}
              className="w-full bg-black py-3 text-xs font-extrabold tracking-wider text-white uppercase disabled:opacity-60"
            >
              {busy ? 'Uploading…' : 'Submit to A&R'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
