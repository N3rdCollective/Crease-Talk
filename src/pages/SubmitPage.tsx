import { useState, type FormEvent } from 'react'
import { PageHeader } from '../components/PageHeader'
import { supabase } from '../lib/supabase/client'

export function SubmitPage() {
  const [artistName, setArtistName] = useState('')
  const [trackTitle, setTrackTitle] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'done' | 'error'>(
    'idle',
  )
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!file) {
      setMessage('Please attach an audio file.')
      setStatus('error')
      return
    }

    setStatus('uploading')
    setMessage(null)

    try {
      const ext = file.name.split('.').pop() || 'mp3'
      const path = `${crypto.randomUUID()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('music-submissions')
        .upload(path, file, {
          contentType: file.type || 'audio/mpeg',
          upsert: false,
        })
      if (uploadError) throw uploadError

      const { error: insertError } = await supabase
        .from('music_submissions')
        .insert({
          artist_name: artistName.trim(),
          track_title: trackTitle.trim(),
          contact_email: email.trim(),
          notes: notes.trim() || null,
          audio_file_path: path,
          status: 'pending',
        })
      if (insertError) throw insertError

      setStatus('done')
      setMessage('Submission received. CreaseTalk staff will review it.')
      setArtistName('')
      setTrackTitle('')
      setEmail('')
      setNotes('')
      setFile(null)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Submission failed')
    }
  }

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        <PageHeader
          title="SUBMIT MUSIC"
          description="Send your track for CreaseTalk review. Audio stays private until staff approve."
        />

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block text-xs font-bold tracking-wide uppercase">
            Artist name
            <input
              required
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              className="mt-2 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-bold tracking-wide uppercase">
            Track title
            <input
              required
              value={trackTitle}
              onChange={(e) => setTrackTitle(e.target.value)}
              className="mt-2 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-bold tracking-wide uppercase">
            Contact email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-bold tracking-wide uppercase">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="mt-2 w-full border border-ct-border px-3 py-2 text-sm font-normal normal-case"
            />
          </label>
          <label className="block text-xs font-bold tracking-wide uppercase">
            Audio file
            <input
              required
              type="file"
              accept="audio/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="mt-2 block w-full text-sm font-normal normal-case"
            />
          </label>

          {message && (
            <p
              className={`text-sm ${
                status === 'error' ? 'text-red-600' : 'text-black/70'
              }`}
            >
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={status === 'uploading'}
            className="bg-black px-6 py-3 text-xs font-extrabold tracking-wider text-white uppercase disabled:opacity-60"
          >
            {status === 'uploading' ? 'Uploading…' : 'Submit track'}
          </button>
        </form>
      </div>
    </section>
  )
}
