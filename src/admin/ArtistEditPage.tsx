import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase/client'
import { ArtistImagePanel } from './ArtistImagePanel'
import { SpotifyFixPanel } from './SpotifyFixPanel'

type ArtistRow = {
  id: string
  name: string
  spotify_id: string | null
  image_url: string | null
  image_locked: boolean
  genres: string[]
  followers: number
  spotify_url: string | null
  youtube_channel_id: string | null
  is_verified: boolean
  is_featured: boolean
  display_order: number
  bio: string | null
}

type LinkedVideo = {
  id: string
  title: string
  thumbnail_url: string | null
  approval_status: string
  youtube_video_id: string
}

function parseGenres(input: string): string[] {
  return input
    .split(',')
    .map((g) => g.trim())
    .filter(Boolean)
}

export function ArtistEditPage() {
  const { artistId } = useParams<{ artistId: string }>()
  const [artist, setArtist] = useState<ArtistRow | null>(null)
  const [videos, setVideos] = useState<LinkedVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [imageOpen, setImageOpen] = useState(false)
  const [fixOpen, setFixOpen] = useState(false)

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [genresText, setGenresText] = useState('')
  const [youtubeChannelId, setYoutubeChannelId] = useState('')
  const [isVerified, setIsVerified] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)
  const [displayOrder, setDisplayOrder] = useState(0)

  const load = useCallback(async () => {
    if (!artistId) return
    setLoading(true)
    setError(null)
    try {
      const [artistRes, mediaRes] = await Promise.all([
        supabase
          .from('artists')
          .select(
            'id, name, spotify_id, image_url, image_locked, genres, followers, spotify_url, youtube_channel_id, is_verified, is_featured, display_order, bio',
          )
          .eq('id', artistId)
          .maybeSingle(),
        supabase
          .from('media_assets')
          .select(
            'id, title, thumbnail_url, approval_status, youtube_video_id',
          )
          .eq('artist_id', artistId)
          .eq('approval_status', 'approved')
          .order('published_at', { ascending: false }),
      ])

      if (artistRes.error) throw artistRes.error
      if (!artistRes.data) {
        setArtist(null)
        setError('Artist profile not found')
        return
      }

      const row = artistRes.data as ArtistRow
      setArtist(row)
      setName(row.name)
      setBio(row.bio ?? '')
      setGenresText((row.genres ?? []).join(', '))
      setYoutubeChannelId(row.youtube_channel_id ?? '')
      setIsVerified(row.is_verified)
      setIsFeatured(row.is_featured)
      setDisplayOrder(row.display_order)
      setVideos((mediaRes.data ?? []) as LinkedVideo[])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load artist')
    } finally {
      setLoading(false)
    }
  }, [artistId])

  useEffect(() => {
    void load()
  }, [load])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    if (!artistId || saving) return
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Name is required')
      return
    }

    setSaving(true)
    setMessage(null)
    setError(null)
    const { error: updateError } = await supabase
      .from('artists')
      .update({
        name: trimmed,
        bio: bio.trim() || null,
        genres: parseGenres(genresText),
        youtube_channel_id: youtubeChannelId.trim() || null,
        is_verified: isVerified,
        is_featured: isFeatured,
        display_order: Number.isFinite(displayOrder) ? displayOrder : 0,
      })
      .eq('id', artistId)
    setSaving(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    setMessage('Profile saved')
    await load()
  }

  async function syncFromSpotify() {
    if (!artistId || syncing) return
    setSyncing(true)
    setMessage(null)
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'spotify-enrich-artist',
        {
          body: { artistId, force: true, keepName: false },
        },
      )
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setMessage('Synced from Spotify (custom image preserved if locked)')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading profile…</p>
  }

  if (!artist) {
    return (
      <div>
        <p className="text-sm text-red-600">{error ?? 'Artist not found'}</p>
        <Link
          to="/admin/artists"
          className="mt-4 inline-block text-xs font-bold uppercase text-neutral-600 hover:text-black"
        >
          ← Artist profiles
        </Link>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to="/admin/artists"
            className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase hover:text-black"
          >
            ← Artist profiles
          </Link>
          <h2 className="mt-2 text-2xl font-black tracking-tight uppercase">
            Edit artist
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Edits save to Supabase and show on the public profile.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/artists/${artist.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-neutral-300 bg-white px-3 py-2 text-xs font-bold uppercase"
          >
            View public profile
          </a>
          <button
            type="button"
            disabled={syncing}
            onClick={() => void syncFromSpotify()}
            className="bg-black px-3 py-2 text-xs font-bold text-white uppercase disabled:opacity-50"
          >
            {syncing ? 'Syncing…' : 'Sync from Spotify'}
          </button>
          <button
            type="button"
            onClick={() => setFixOpen(true)}
            className="border border-neutral-300 bg-white px-3 py-2 text-xs font-bold uppercase"
          >
            Fix Spotify
          </button>
        </div>
      </div>

      {(message || error) && (
        <p
          className={`mt-4 text-sm ${error ? 'text-red-600' : 'text-neutral-600'}`}
        >
          {error ?? message}
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="border border-neutral-200 bg-white p-4">
          <button
            type="button"
            onClick={() => setImageOpen(true)}
            className="group relative mx-auto block"
            title="Change main image"
          >
            {artist.image_url ? (
              <img
                src={artist.image_url}
                alt=""
                className="h-40 w-40 rounded-full object-cover"
              />
            ) : (
              <div className="h-40 w-40 rounded-full bg-neutral-200" />
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-[10px] font-bold text-white uppercase opacity-0 transition-opacity group-hover:opacity-100">
              Edit image
            </span>
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500">
            {artist.image_locked
              ? 'Custom image locked from Spotify sync'
              : 'Using Spotify / unlocked image'}
          </p>
          <p className="mt-2 text-center text-xs text-neutral-400">
            {artist.followers.toLocaleString()} followers
          </p>
          {artist.spotify_url && (
            <a
              href={artist.spotify_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block text-center text-[10px] font-bold text-ct-orange uppercase underline"
            >
              Open Spotify
            </a>
          )}
        </div>

        <form
          onSubmit={onSave}
          className="space-y-4 border border-neutral-200 bg-white p-5"
        >
          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
              Name
            </span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm"
              required
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
              Bio
            </span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="Custom CreaseTalk biography…"
              className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
              Genres
            </span>
            <input
              value={genresText}
              onChange={(e) => setGenresText(e.target.value)}
              placeholder="hip hop, r&b, drill"
              className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
            <span className="mt-1 block text-xs text-neutral-400">
              Comma-separated. Saved to Supabase as the live profile genres.
            </span>
          </label>

          <label className="block">
            <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
              YouTube channel ID
            </span>
            <input
              value={youtubeChannelId}
              onChange={(e) => setYoutubeChannelId(e.target.value)}
              placeholder="UCxxxx"
              className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
              />
              Verified
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
              />
              Featured
            </label>
            <label className="block">
              <span className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 uppercase">
                Display order
              </span>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="mt-2 w-full border border-neutral-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link
              to="/admin/artists"
              className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-ct-orange px-4 py-2 text-xs font-bold text-black uppercase disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save profile'}
            </button>
          </div>
        </form>
      </div>

      <section className="mt-8 border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-black tracking-tight uppercase">
          Linked CreaseTalk videos
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Approved media linked to this artist. Manage approval in the video
          queue.
        </p>
        {videos.length === 0 ? (
          <p className="mt-4 text-sm text-neutral-500">No linked videos yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-neutral-100 border border-neutral-100">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center gap-3 px-3 py-2">
                {v.thumbnail_url ? (
                  <img
                    src={v.thumbnail_url}
                    alt=""
                    className="h-12 w-20 object-cover"
                  />
                ) : (
                  <div className="h-12 w-20 bg-neutral-200" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{v.title}</p>
                  <p className="text-[10px] text-neutral-400 uppercase">
                    {v.approval_status}
                  </p>
                </div>
                <a
                  href={`https://www.youtube.com/watch?v=${v.youtube_video_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-bold text-ct-orange uppercase"
                >
                  YouTube
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {imageOpen && (
        <ArtistImagePanel
          artistId={artist.id}
          artistName={artist.name}
          currentImageUrl={artist.image_url}
          imageLocked={artist.image_locked}
          onClose={() => setImageOpen(false)}
          onSaved={() => {
            setMessage('Image updated')
            setImageOpen(false)
            void load()
          }}
        />
      )}

      {fixOpen && (
        <SpotifyFixPanel
          mode="fix"
          artistId={artist.id}
          artistName={artist.name}
          currentSpotifyUrl={artist.spotify_url}
          onClose={() => setFixOpen(false)}
          onLinked={() => {
            setMessage('Spotify link updated')
            setFixOpen(false)
            void load()
          }}
        />
      )}
    </div>
  )
}
