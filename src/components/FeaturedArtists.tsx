import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Carousel } from './Carousel'
import { SectionHeader } from './SectionHeader'
import {
  fetchFeaturedArtists,
  syncFeaturedArtistsFromSpotify,
  type ArtistRow,
} from '../lib/artists'

export function FeaturedArtists() {
  const [artists, setArtists] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        let rows = await fetchFeaturedArtists()

        // First visit / missing Spotify data: enrich via Edge Function, then reload
        const needsSync = rows.some((a) => !a.spotify_id || !a.image_url)
        if (needsSync && rows.length > 0) {
          try {
            await syncFeaturedArtistsFromSpotify(false)
            rows = await fetchFeaturedArtists()
          } catch (err) {
            console.warn('Spotify enrich skipped:', err)
          }
        }

        if (!cancelled) setArtists(rows)
      } catch (err) {
        console.error('Failed to load featured artists:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section id="artists" className="bg-white pb-14 md:pb-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader title="FEATURED ARTISTS" href="/new-artists" />

        {loading && (
          <div className="flex gap-5 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex w-[140px] shrink-0 flex-col items-center sm:w-[160px]"
              >
                <div className="aspect-square w-full animate-pulse rounded-full bg-[#f3f3f3]" />
                <div className="mt-4 h-4 w-20 animate-pulse bg-[#f3f3f3]" />
              </div>
            ))}
          </div>
        )}

        {!loading && artists.length > 0 && (
          <Carousel ariaLabel="Featured artists">
            {artists.map((artist) => {
              const genre = artist.genres[0] || 'Artist'
              return (
                <Link
                  key={artist.id}
                  to={`/artists/${artist.id}`}
                  className="group flex w-[140px] shrink-0 snap-start flex-col items-center text-center sm:w-[160px]"
                >
                  <ArtistAvatar name={artist.name} imageUrl={artist.image_url} />
                  <h3 className="mt-4 text-sm font-extrabold tracking-tight uppercase">
                    {artist.name}
                  </h3>
                  <p className="mt-1 text-xs capitalize text-black/60">{genre}</p>
                </Link>
              )
            })}
          </Carousel>
        )}

        {!loading && artists.length === 0 && (
          <p className="text-sm text-black/60">No featured artists yet.</p>
        )}
      </div>
    </section>
  )
}

function ArtistAvatar({
  name,
  imageUrl,
}: {
  name: string
  imageUrl: string | null
}) {
  return (
    <div className="aspect-square w-full overflow-hidden rounded-full border border-ct-border bg-[#f3f3f3] transition-colors group-hover:border-black">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
        />
      ) : null}
    </div>
  )
}
