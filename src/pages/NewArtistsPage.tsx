import { useEffect, useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import {
  fetchAllArtists,
  type ArtistRow,
} from '../lib/artists'

function formatFollowers(count: number): string {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M followers`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K followers`
  }
  if (count > 0) return `${count} followers`
  return 'Artist'
}

export function NewArtistsPage() {
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    window.scrollTo(0, 0)

    fetchAllArtists()
      .then((rows) => {
        if (!cancelled) setArtists(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load artists')
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
          title="NEW ARTISTS"
          description="Fresh talent on CreaseTalk — profiles enriched with Spotify catalog data."
        />

        {loading && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="aspect-square w-full animate-pulse rounded-full bg-[#f3f3f3]" />
                <div className="mt-4 h-4 w-24 animate-pulse bg-[#f3f3f3]" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <p className="text-sm text-black/60">{error}</p>
        )}

        {!loading && !error && artists.length > 0 && (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {artists.map((artist) => {
              const genre = artist.genres[0]
              const content = (
                <>
                  <div className="aspect-square w-full overflow-hidden rounded-full border border-ct-border bg-[#f3f3f3] transition-colors group-hover:border-black">
                    {artist.image_url && (
                      <img
                        src={artist.image_url}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    )}
                  </div>
                  <h3 className="mt-4 text-sm font-extrabold tracking-tight uppercase">
                    {artist.name}
                  </h3>
                  <p className="mt-1 text-xs capitalize text-black/60">
                    {genre || formatFollowers(artist.followers)}
                  </p>
                  {genre && artist.followers > 0 && (
                    <p className="mt-0.5 text-[11px] text-black/45">
                      {formatFollowers(artist.followers)}
                    </p>
                  )}
                </>
              )

              if (artist.spotify_url) {
                return (
                  <a
                    key={artist.id}
                    href={artist.spotify_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center text-center"
                  >
                    {content}
                  </a>
                )
              }

              return (
                <div
                  key={artist.id}
                  className="group flex flex-col items-center text-center"
                >
                  {content}
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && artists.length === 0 && (
          <p className="text-sm text-black/60">No artists found yet.</p>
        )}
      </div>
    </section>
  )
}
