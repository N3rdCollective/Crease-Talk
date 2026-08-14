import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { supabase } from '../lib/supabase/client'
import {
  syncAllArtistsProfiles,
  syncArtistBiosFromLastFm,
  syncArtistCatalogsFromSpotify,
  syncFeaturedArtistsFromSpotify,
} from '../lib/artists'
import { SpotifyFixPanel } from './SpotifyFixPanel'

type ArtistAdmin = {
  id: string
  name: string
  spotify_id: string | null
  image_url: string | null
  image_locked: boolean
  genres: string[]
  followers: number
  spotify_url: string | null
  is_verified: boolean
  is_featured: boolean
  display_order: number
}

function formatFollowers(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(n)
}

export function ArtistsAdminPage() {
  const [rows, setRows] = useState<ArtistAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [fixArtist, setFixArtist] = useState<ArtistAdmin | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('artists')
      .select(
        'id, name, spotify_id, image_url, image_locked, genres, followers, spotify_url, is_verified, is_featured, display_order',
      )
      .order('display_order', { ascending: true })
    if (error) setMessage(error.message)
    else setRows((data ?? []) as ArtistAdmin[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<ArtistAdmin>[]>(
    () => [
      {
        accessorKey: 'image_url',
        header: '',
        cell: ({ row }) =>
          row.original.image_url ? (
            <img
              src={row.original.image_url}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-neutral-200" />
          ),
      },
      {
        accessorKey: 'name',
        header: 'Artist',
        cell: ({ row }) => (
          <div>
            <Link
              to={`/admin/artists/${row.original.id}`}
              className="font-bold text-black underline-offset-2 hover:underline"
            >
              {row.original.name}
            </Link>
            {row.original.image_locked && (
              <p className="mt-1 text-[9px] font-bold tracking-wide text-neutral-400 uppercase">
                Custom image
              </p>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'followers',
        header: 'Followers',
        cell: ({ getValue }) => formatFollowers(Number(getValue<number>())),
      },
      {
        accessorKey: 'is_verified',
        header: 'Verified',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.is_verified}
            aria-label={`Verified ${row.original.name}`}
            onChange={(e) => {
              void supabase
                .from('artists')
                .update({ is_verified: e.target.checked })
                .eq('id', row.original.id)
                .then(({ error }) => {
                  if (error) setMessage(error.message)
                  else void load()
                })
            }}
          />
        ),
      },
      {
        accessorKey: 'is_featured',
        header: 'Featured',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.is_featured}
            aria-label={`Featured ${row.original.name}`}
            onChange={(e) => {
              void supabase
                .from('artists')
                .update({ is_featured: e.target.checked })
                .eq('id', row.original.id)
                .then(({ error }) => {
                  if (error) setMessage(error.message)
                  else void load()
                })
            }}
          />
        ),
      },
      {
        id: 'spotify',
        header: 'Spotify',
        cell: ({ row }) =>
          row.original.spotify_id ? (
            <span className="text-[10px] font-bold text-green-700 uppercase">
              Linked
            </span>
          ) : (
            <span className="text-[10px] font-bold text-neutral-400 uppercase">
              Not linked
            </span>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1">
            <Link
              to={`/admin/artists/${row.original.id}`}
              className="rounded bg-ct-orange px-2 py-1 text-[10px] font-bold text-black uppercase"
            >
              Edit profile
            </Link>
            <button
              type="button"
              className="rounded bg-black px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => {
                setMessage(null)
                void supabase.functions
                  .invoke('spotify-enrich-artist', {
                    body: {
                      artistId: row.original.id,
                      force: true,
                      keepName: false,
                    },
                  })
                  .then(({ error }) => {
                    if (error) throw error
                    setMessage(`Synced ${row.original.name}`)
                    return load()
                  })
                  .catch((err: unknown) => {
                    setMessage(
                      err instanceof Error
                        ? err.message
                        : 'Spotify sync failed',
                    )
                  })
              }}
            >
              Sync
            </button>
            <button
              type="button"
              className="rounded border border-neutral-300 bg-white px-2 py-1 text-[10px] font-bold uppercase"
              onClick={() => setFixArtist(row.original)}
            >
              Fix
            </button>
            <button
              type="button"
              className="px-2 py-1 text-[10px] font-bold text-red-600 uppercase"
              onClick={() => {
                if (!confirm(`Delete ${row.original.name}?`)) return
                void supabase
                  .from('artists')
                  .delete()
                  .eq('id', row.original.id)
                  .then(load)
              }}
            >
              Delete
            </button>
          </div>
        ),
      },
    ],
    [load],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Artist profiles
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Add artist = Spotify profile + Last.fm bio + discography in one
            click. Bulk buttons below backfill existing artists.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              setAddOpen(true)
            }}
            className="bg-ct-orange px-4 py-2 text-xs font-bold text-black uppercase"
          >
            Add artist
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              setMessage('Filling all artist profiles… this can take a minute')
              void syncAllArtistsProfiles()
                .then((data) => {
                  const failed = (data.results ?? []).filter((r) => !r.ok)
                  setMessage(
                    `Filled ${data.ok ?? 0}/${data.synced ?? 0} artists · ${data.withBio ?? 0} bios · ${data.releases ?? 0} releases` +
                      (failed.length
                        ? ` · ${failed.length} failed (${failed.map((f) => f.name).join(', ')})`
                        : ''),
                  )
                  return load()
                })
                .catch((err: unknown) => {
                  setMessage(
                    err instanceof Error
                      ? err.message
                      : 'Fill all profiles failed',
                  )
                })
            }}
            className="bg-black px-4 py-2 text-xs font-bold text-white uppercase"
          >
            Fill all profiles
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              void syncFeaturedArtistsFromSpotify(true)
                .then(() => {
                  setMessage('Featured Spotify sync complete')
                  return load()
                })
                .catch((err: unknown) => {
                  setMessage(
                    err instanceof Error ? err.message : 'Featured sync failed',
                  )
                })
            }}
            className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase"
          >
            Sync featured Spotify
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              void syncArtistBiosFromLastFm(false)
                .then((data) => {
                  setMessage(
                    `Last.fm bios: filled ${data.filled ?? 0} of ${data.synced ?? 0}`,
                  )
                  return load()
                })
                .catch((err: unknown) => {
                  setMessage(
                    err instanceof Error ? err.message : 'Last.fm bio sync failed',
                  )
                })
            }}
            className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase"
          >
            Import Last.fm bios
          </button>
          <button
            type="button"
            onClick={() => {
              setMessage(null)
              void syncArtistCatalogsFromSpotify()
                .then((data) => {
                  setMessage(
                    `Spotify catalog: ${data.releases ?? 0} releases across ${data.synced ?? 0} artists`,
                  )
                  return load()
                })
                .catch((err: unknown) => {
                  setMessage(
                    err instanceof Error
                      ? err.message
                      : 'Spotify catalog sync failed',
                  )
                })
            }}
            className="border border-neutral-300 bg-white px-4 py-2 text-xs font-bold uppercase"
          >
            Sync Spotify catalogs
          </button>
        </div>
      </div>

      {message && <p className="mt-4 text-sm text-neutral-600">{message}</p>}

      {addOpen && (
        <SpotifyFixPanel
          mode="add"
          onClose={() => setAddOpen(false)}
          onLinked={(name) => {
            setMessage(name ? `Added ${name}` : 'Artist added')
            setAddOpen(false)
            void load()
          }}
        />
      )}

      {fixArtist && (
        <SpotifyFixPanel
          mode="fix"
          artistId={fixArtist.id}
          artistName={fixArtist.name}
          currentSpotifyUrl={fixArtist.spotify_url}
          onClose={() => setFixArtist(null)}
          onLinked={() => {
            setMessage(`Linked Spotify for ${fixArtist.name}`)
            setFixArtist(null)
            void load()
          }}
        />
      )}

      <div className="mt-6 overflow-x-auto border border-neutral-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-neutral-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No artist profiles yet.</p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black text-xs text-white uppercase">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2">
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-t border-neutral-100">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-3 py-2">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
