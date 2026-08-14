import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import {
  fetchLatestReleases,
  type CatalogRelease,
} from '../lib/artists'

function releaseMeta(release: CatalogRelease) {
  const year = release.release_date?.slice(0, 4)
  const type = release.album_type
  if (year && type) return `${type} · ${year}`
  if (type) return type
  if (year) return year
  return 'Release'
}

export function NewMusicPage() {
  const [releases, setReleases] = useState<CatalogRelease[]>([])
  const [active, setActive] = useState<CatalogRelease | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.scrollTo(0, 0)
    setLoading(true)
    setError(null)

    fetchLatestReleases(60)
      .then((rows) => {
        if (!cancelled) setReleases(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load new music',
          )
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <PageHeader
          title="NEW MUSIC"
          description="Newest albums and singles from CreaseTalk artists — pulled from the Spotify catalog."
          backTo="/#discover"
        />

        {loading && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-square animate-pulse bg-[#f3f3f3]" />
                <div className="mt-3 h-4 w-3/4 animate-pulse bg-[#f3f3f3]" />
                <div className="mt-2 h-3 w-1/2 animate-pulse bg-[#f3f3f3]" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-black/60">{error}</p>
        )}

        {!loading && !error && releases.length === 0 && (
          <p className="text-sm text-black/60">
            No catalog releases yet. Sync artist discographies from admin to
            populate this page.
          </p>
        )}

        {!loading && !error && releases.length > 0 && (
          <>
            {active && (
              <div className="mb-8 border border-ct-border bg-black p-3 md:p-4">
                <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-white">
                      {active.name}
                    </p>
                    <p className="text-[10px] font-bold tracking-wide text-white/50 uppercase">
                      {active.artist?.name ?? 'Artist'}
                      {active.release_date
                        ? ` · ${active.release_date.slice(0, 4)}`
                        : ''}
                      {` · ${active.album_type}`}
                    </p>
                    {active.artist && (
                      <Link
                        to={`/artists/${active.artist.id}`}
                        className="mt-2 inline-block text-[10px] font-bold tracking-wide text-ct-orange uppercase hover:underline"
                      >
                        View artist profile →
                      </Link>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setActive(null)}
                    className="shrink-0 text-[10px] font-bold tracking-wide text-white/60 uppercase hover:text-white"
                  >
                    Close
                  </button>
                </div>
                <iframe
                  title={`Spotify — ${active.name}`}
                  src={`https://open.spotify.com/embed/album/${active.spotify_album_id}?utm_source=generator&theme=0`}
                  width="100%"
                  height="352"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  className="w-full border-0"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {releases.map((release) => {
                const selected = active?.id === release.id
                return (
                  <article
                    key={release.id}
                    className={`group text-left ${
                      selected ? 'ring-2 ring-ct-orange ring-offset-2' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActive(release)}
                      className="block w-full text-left"
                    >
                      <div className="aspect-square bg-[#f3f3f3]">
                        {release.image_url ? (
                          <img
                            src={release.image_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : null}
                      </div>
                      <p className="mt-2 truncate text-sm font-bold group-hover:underline">
                        {release.name}
                      </p>
                    </button>
                    {release.artist ? (
                      <Link
                        to={`/artists/${release.artist.id}`}
                        className="mt-0.5 block truncate text-xs font-bold tracking-wide text-black/70 uppercase hover:text-ct-orange"
                      >
                        {release.artist.name}
                      </Link>
                    ) : (
                      <p className="mt-0.5 truncate text-xs text-black/50">
                        Artist
                      </p>
                    )}
                    <p className="mt-0.5 truncate text-[10px] font-bold tracking-wide text-black/45 uppercase">
                      {releaseMeta(release)}
                    </p>
                  </article>
                )
              })}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
