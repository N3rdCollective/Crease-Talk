import { useRef, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase/client'

type Props = {
  artistId: string
  artistName: string
  currentImageUrl: string | null
  imageLocked: boolean
  onClose: () => void
  onSaved: () => void
}

const MAX_BYTES = 5 * 1024 * 1024
const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif'

function extFromMime(mime: string) {
  if (mime === 'image/png') return 'png'
  if (mime === 'image/webp') return 'webp'
  if (mime === 'image/gif') return 'gif'
  return 'jpg'
}

export function ArtistImagePanel({
  artistId,
  artistName,
  currentImageUrl,
  imageLocked,
  onClose,
  onSaved,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlInput, setUrlInput] = useState(currentImageUrl ?? '')
  const [preview, setPreview] = useState(currentImageUrl)
  const [busy, setBusy] = useState<'upload' | 'url' | 'spotify' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function saveImage(imageUrl: string, locked: boolean) {
    const { error: updateError } = await supabase
      .from('artists')
      .update({ image_url: imageUrl, image_locked: locked })
      .eq('id', artistId)
    if (updateError) throw updateError
  }

  async function onUpload(file: File) {
    if (!ACCEPT.split(',').includes(file.type)) {
      setError('Use JPEG, PNG, WebP, or GIF.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Image must be 5MB or smaller.')
      return
    }

    setBusy('upload')
    setError(null)
    try {
      const ext = extFromMime(file.type)
      const path = `${artistId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('artist-images')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: true,
          contentType: file.type,
        })
      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('artist-images').getPublicUrl(path)
      const publicUrl = data.publicUrl
      await saveImage(publicUrl, true)
      setPreview(publicUrl)
      setUrlInput(publicUrl)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
      setBusy(null)
    }
  }

  async function onSaveUrl(e: FormEvent) {
    e.preventDefault()
    const url = urlInput.trim()
    if (!url) return
    setBusy('url')
    setError(null)
    try {
      await saveImage(url, true)
      setPreview(url)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
      setBusy(null)
    }
  }

  async function restoreSpotify() {
    setBusy('spotify')
    setError(null)
    try {
      const { error: unlockError } = await supabase
        .from('artists')
        .update({ image_locked: false })
        .eq('id', artistId)
      if (unlockError) throw unlockError

      const { data, error: fnError } = await supabase.functions.invoke(
        'spotify-enrich-artist',
        { body: { artistId, force: true, keepName: false } },
      )
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)

      const nextUrl = (data?.artist?.image_url as string | undefined) ?? null
      setPreview(nextUrl)
      setUrlInput(nextUrl ?? '')
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spotify restore failed')
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="artist-image-title"
        className="w-full max-w-md border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ct-orange uppercase">
              Main image
            </p>
            <h3
              id="artist-image-title"
              className="mt-1 text-lg font-black tracking-tight uppercase"
            >
              {artistName}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-neutral-500 uppercase hover:text-black"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          <div className="flex items-center gap-4">
            {preview ? (
              <img
                src={preview}
                alt=""
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-neutral-200" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs text-neutral-500">
                {imageLocked || busy
                  ? 'Custom image is locked from Spotify sync.'
                  : 'Using Spotify image (unlocked).'}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onUpload(file)
                  e.target.value = ''
                }}
              />
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => fileRef.current?.click()}
                className="mt-2 bg-ct-orange px-3 py-2 text-[10px] font-bold text-black uppercase disabled:opacity-50"
              >
                {busy === 'upload' ? 'Uploading…' : 'Upload image'}
              </button>
            </div>
          </div>

          <form onSubmit={onSaveUrl} className="space-y-2">
            <h4 className="text-xs font-bold tracking-wide uppercase">
              Or paste image URL
            </h4>
            <div className="flex gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://…"
                className="min-w-0 flex-1 border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={!urlInput.trim() || Boolean(busy)}
                className="shrink-0 bg-black px-3 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-50"
              >
                {busy === 'url' ? '…' : 'Save'}
              </button>
            </div>
          </form>

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void restoreSpotify()}
            className="w-full border border-neutral-300 bg-white px-3 py-2 text-[10px] font-bold uppercase disabled:opacity-50"
          >
            {busy === 'spotify' ? 'Restoring…' : 'Restore Spotify image'}
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
