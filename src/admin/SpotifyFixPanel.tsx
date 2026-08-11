import { useState } from 'react'
import { supabase } from '../lib/supabase/client'

export type SpotifyCandidate = {
  id: string
  name: string
  followers: number
  genres: string[]
  image_url: string | null
  spotify_url: string | null
}

type Props = {
  artistId: string
  artistName: string
  currentSpotifyUrl: string | null
  onClose: () => void
  onLinked: () => void
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function SpotifyFixPanel({
  artistId,
  artistName,
  currentSpotifyUrl,
  onClose,
  onLinked,
}: Props) {
  const [linkInput, setLinkInput] = useState(currentSpotifyUrl ?? '')
  const [searchQuery, setSearchQuery] = useState(artistName)
  const [results, setResults] = useState<SpotifyCandidate[]>([])
  const [busy, setBusy] = useState<'search' | 'link' | string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [useSpotifyName, setUseSpotifyName] = useState(false)

  async function runSearch() {
    const q = searchQuery.trim()
    if (!q) return
    setBusy('search')
    setError(null)
    try {
      const { data, error: fnError } = await supabase.functions.invoke(
        'spotify-enrich-artist',
        { body: { searchQuery: q, searchLimit: 8 } },
      )
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      setResults((data?.results ?? []) as SpotifyCandidate[])
      if (!(data?.results?.length > 0)) {
        setError('No Spotify artists found for that search.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setBusy(null)
    }
  }

  async function applyLink(spotifyIdOrUrl: string) {
    setBusy(spotifyIdOrUrl)
    setError(null)
    try {
      const looksLikeId = /^[a-zA-Z0-9]{22}$/.test(spotifyIdOrUrl.trim())
      const body = looksLikeId
        ? {
            artistId,
            spotifyId: spotifyIdOrUrl.trim(),
            keepName: !useSpotifyName,
          }
        : {
            artistId,
            spotifyUrl: spotifyIdOrUrl.trim(),
            keepName: !useSpotifyName,
          }

      const { data, error: fnError } = await supabase.functions.invoke(
        'spotify-enrich-artist',
        { body },
      )
      if (fnError) throw fnError
      if (data?.error) throw new Error(data.error)
      onLinked()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Link failed')
      setBusy(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="spotify-fix-title"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-ct-orange uppercase">
              Correct match
            </p>
            <h3
              id="spotify-fix-title"
              className="mt-1 text-lg font-black tracking-tight uppercase"
            >
              Fix Spotify — {artistName}
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

        <div className="space-y-6 px-5 py-5">
          <label className="flex items-center gap-2 text-xs text-neutral-600">
            <input
              type="checkbox"
              checked={useSpotifyName}
              onChange={(e) => setUseSpotifyName(e.target.checked)}
            />
            Also replace CreaseTalk name with Spotify artist name
          </label>

          <section>
            <h4 className="text-xs font-bold tracking-wide uppercase">
              Paste Spotify artist link
            </h4>
            <p className="mt-1 text-xs text-neutral-500">
              open.spotify.com/artist/… or spotify:artist:…
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                placeholder="https://open.spotify.com/artist/…"
                className="min-w-0 flex-1 border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!linkInput.trim() || Boolean(busy)}
                onClick={() => void applyLink(linkInput)}
                className="shrink-0 bg-black px-3 py-2 text-[10px] font-bold text-white uppercase disabled:opacity-50"
              >
                {busy === linkInput || busy === 'link' ? '…' : 'Apply'}
              </button>
            </div>
          </section>

          <section>
            <h4 className="text-xs font-bold tracking-wide uppercase">
              Search Spotify
            </h4>
            <div className="mt-2 flex gap-2">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void runSearch()
                  }
                }}
                className="min-w-0 flex-1 border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={!searchQuery.trim() || Boolean(busy)}
                onClick={() => void runSearch()}
                className="shrink-0 bg-ct-orange px-3 py-2 text-[10px] font-bold text-black uppercase disabled:opacity-50"
              >
                {busy === 'search' ? '…' : 'Search'}
              </button>
            </div>

            <ul className="mt-3 divide-y divide-neutral-100 border border-neutral-200">
              {results.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  {c.image_url ? (
                    <img
                      src={c.image_url}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-neutral-200" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-neutral-500">
                      {formatFollowers(c.followers)} followers
                      {c.genres[0] ? ` · ${c.genres[0]}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void applyLink(c.id)}
                    className="shrink-0 rounded bg-black px-2 py-1 text-[10px] font-bold text-white uppercase disabled:opacity-50"
                  >
                    {busy === c.id ? '…' : 'Use'}
                  </button>
                </li>
              ))}
              {results.length === 0 && (
                <li className="px-3 py-4 text-xs text-neutral-400">
                  Search to see candidates, then click Use.
                </li>
              )}
            </ul>
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  )
}
