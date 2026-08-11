import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ExternalLink } from 'lucide-react'
import { supabase } from '../lib/supabase/client'
import {
  fetchApprovedMedia,
  mediaToYouTubeVideo,
  type MediaAsset,
} from '../lib/media'
import { VideoCard } from '../components/VideoCard'
import { VideoPlayerModal } from '../components/VideoPlayerModal'
import type { YouTubeVideo } from '../lib/youtube'

type SpotifyTrack = {
  id: string
  name: string
  preview_url: string | null
  spotify_url: string | null
  album_name: string | null
  album_image_url: string | null
  artists: string
}

type ProfilePayload = {
  artist: {
    id: string
    name: string
    spotify_id: string | null
    image_url: string | null
    genres: string[]
    followers: number
    spotify_url: string | null
    is_verified: boolean
    bio: string | null
  } | null
  spotify: {
    id: string
    name: string
    genres: string[]
    followers: number
    image_url: string | null
    spotify_url: string | null
  } | null
  topTracks: SpotifyTrack[]
}

function formatFollowers(count: number) {
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  }
  return String(count)
}

export function ArtistProfilePage() {
  const { artistId } = useParams<{ artistId: string }>()
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [media, setMedia] = useState<MediaAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeVideo, setActiveVideo] = useState<YouTubeVideo | null>(null)

  useEffect(() => {
    if (!artistId) return
    let cancelled = false
    window.scrollTo(0, 0)
    setLoading(true)

    async function load() {
      try {
        const [{ data, error: fnError }, allMedia] = await Promise.all([
          supabase.functions.invoke('spotify-artist-profile', {
            body: { artistId },
          }),
          fetchApprovedMedia({ limit: 50 }),
        ])
        if (fnError) throw fnError
        if (data?.error) throw new Error(data.error)
        if (cancelled) return

        setProfile(data as ProfilePayload)
        const linked = allMedia.filter((m) => m.artist_id === artistId)
        setMedia(linked)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load profile')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [artistId])

  const name = profile?.spotify?.name || profile?.artist?.name || 'Artist'
  // Spotify compliance: use official image URL as-is (object-contain, no crop filters)
  const imageUrl =
    profile?.spotify?.image_url || profile?.artist?.image_url || null
  const followers =
    profile?.spotify?.followers ?? profile?.artist?.followers ?? 0
  const genres = profile?.spotify?.genres?.length
    ? profile.spotify.genres
    : profile?.artist?.genres ?? []
  const spotifyUrl =
    profile?.spotify?.spotify_url || profile?.artist?.spotify_url || null

  return (
    <section className="bg-white pb-16">
      <div className="bg-black text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[280px_1fr] md:px-8 md:py-16">
          <div className="mx-auto w-full max-w-[280px]">
            <div className="aspect-square w-full bg-[#1a1a1a]">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={`${name} on Spotify`}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>
            {spotifyUrl && (
              <a
                href={spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold tracking-wide text-ct-orange uppercase"
              >
                Listen on Spotify
                <ExternalLink className="size-3" />
              </a>
            )}
          </div>

          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
              Artist profile
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight uppercase md:text-5xl">
              {name}
            </h1>
            <p className="mt-3 text-sm text-white/70">
              {followers > 0
                ? `${formatFollowers(followers)} Spotify followers`
                : 'CreaseTalk artist'}
            </p>
            {genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {genres.slice(0, 6).map((g) => (
                  <span
                    key={g}
                    className="border border-white/20 px-2 py-1 text-[10px] font-bold tracking-wide uppercase"
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
            {profile?.artist?.bio && (
              <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/80">
                {profile.artist.bio}
              </p>
            )}
            <Link
              to="/new-artists"
              className="mt-6 text-xs font-bold tracking-wide text-white/60 uppercase hover:text-white"
            >
              ← All artists
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {loading && (
          <p className="text-sm text-black/60">Loading artist profile…</p>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && !error && (
          <>
            <section>
              <h2 className="text-xl font-black tracking-tight uppercase">
                Top tracks
              </h2>
              <p className="mt-1 text-xs text-black/50">
                Popular songs from Spotify. Artwork and links provided by
                Spotify.
              </p>
              {(profile?.topTracks?.length ?? 0) === 0 ? (
                <p className="mt-4 text-sm text-black/60">
                  No top tracks available yet.
                </p>
              ) : (
                <ol className="mt-5 divide-y divide-ct-border border border-ct-border">
                  {profile!.topTracks.map((track, i) => (
                    <li
                      key={track.id}
                      className="flex items-center gap-3 px-3 py-3"
                    >
                      <span className="w-6 text-xs font-bold text-black/40">
                        {i + 1}
                      </span>
                      {track.album_image_url ? (
                        <img
                          src={track.album_image_url}
                          alt=""
                          className="h-12 w-12 object-contain bg-[#f3f3f3]"
                        />
                      ) : (
                        <div className="h-12 w-12 bg-[#f3f3f3]" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold">
                          {track.name}
                        </p>
                        <p className="truncate text-xs text-black/50">
                          {track.album_name || track.artists}
                        </p>
                      </div>
                      {track.spotify_url && (
                        <a
                          href={track.spotify_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-[10px] font-bold tracking-wide text-ct-orange uppercase"
                        >
                          Spotify
                        </a>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </section>

            <section className="mt-12">
              <h2 className="text-xl font-black tracking-tight uppercase">
                On CreaseTalk
              </h2>
              <p className="mt-1 text-xs text-black/50">
                Performances and interviews from our catalog.
              </p>
              {media.length === 0 ? (
                <p className="mt-4 text-sm text-black/60">
                  No approved CreaseTalk videos linked yet.
                </p>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {media.map((row) => {
                    const video = mediaToYouTubeVideo(row)
                    if (!video) return null
                    return (
                      <VideoCard
                        key={row.id}
                        item={video}
                        layout="grid"
                        onPlay={() => setActiveVideo(video)}
                      />
                    )
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <VideoPlayerModal
        video={activeVideo}
        onClose={() => setActiveVideo(null)}
      />
    </section>
  )
}
