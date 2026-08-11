import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { supabase } from '../lib/supabase/client'
import { syncFeaturedArtistsFromSpotify } from '../lib/artists'
import { SpotifyFixPanel } from './SpotifyFixPanel'

type ArtistAdmin = {
  id: string
  name: string
  spotify_id: string | null
  image_url: string | null
  genres: string[]
  followers: number
  spotify_url: string | null
  youtube_channel_id: string | null
  is_verified: boolean
  is_featured: boolean
  display_order: number
  bio: string | null
}

export function ArtistsAdminPage() {
  const [rows, setRows] = useState<ArtistAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [fixArtist, setFixArtist] = useState<ArtistAdmin | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('artists')
      .select(
        'id, name, spotify_id, image_url, genres, followers, spotify_url, youtube_channel_id, is_verified, is_featured, display_order, bio',
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
        header: 'Name',
        cell: ({ row }) => (
          <input
            className="border border-neutral-200 px-2 py-1 text-sm"
            defaultValue={row.original.name}
            onBlur={(e) => {
              const name = e.target.value.trim()
              if (name && name !== row.original.name) {
                void supabase
                  .from('artists')
                  .update({ name })
                  .eq('id', row.original.id)
                  .then(load)
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'youtube_channel_id',
        header: 'YT Channel ID',
        cell: ({ row }) => (
          <input
            className="min-w-[140px] border border-neutral-200 px-2 py-1 text-sm"
            defaultValue={row.original.youtube_channel_id ?? ''}
            placeholder="UCxxxx"
            onBlur={(e) => {
              const youtube_channel_id = e.target.value.trim() || null
              void supabase
                .from('artists')
                .update({ youtube_channel_id })
                .eq('id', row.original.id)
                .then(load)
            }}
          />
        ),
      },
      {
        accessorKey: 'followers',
        header: 'Followers',
        cell: ({ getValue }) =>
          Number(getValue<number>()).toLocaleString(),
      },
      {
        accessorKey: 'is_verified',
        header: 'Verified',
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.original.is_verified}
            onChange={(e) => {
              void supabase
                .from('artists')
                .update({ is_verified: e.target.checked })
                .eq('id', row.original.id)
                .then(load)
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
            onChange={(e) => {
              void supabase
                .from('artists')
                .update({ is_featured: e.target.checked })
                .eq('id', row.original.id)
                .then(load)
            }}
          />
        ),
      },
      {
        id: 'spotify',
        header: 'Spotify',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            {row.original.spotify_url ? (
              <a
                href={row.original.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="max-w-[140px] truncate text-[10px] text-ct-orange underline"
              >
                Open Spotify
              </a>
            ) : (
              <span className="text-[10px] text-neutral-400">No link</span>
            )}
            <div className="flex gap-1">
              <button
                type="button"
                className="rounded bg-black px-2 py-1 text-[10px] font-bold text-white uppercase"
                onClick={() => {
                  setMessage(null)
                  void supabase.functions
                    .invoke('spotify-enrich-artist', {
                      body: { artistId: row.original.id, force: true },
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
            </div>
          </div>
        ),
      },
      {
        id: 'delete',
        header: '',
        cell: ({ row }) => (
          <button
            type="button"
            className="text-[10px] font-bold text-red-600 uppercase"
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

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    const { error } = await supabase.from('artists').insert({ name })
    if (error) setMessage(error.message)
    else {
      setNewName('')
      await load()
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Artists
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            CRUD, verify, link YouTube channels, sync or fix wrong Spotify
            matches.
          </p>
        </div>
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
          className="bg-black px-4 py-2 text-xs font-bold text-white uppercase"
        >
          Sync featured Spotify
        </button>
      </div>

      <form onSubmit={onCreate} className="mt-6 flex flex-wrap gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New artist name"
          className="border border-neutral-300 bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="bg-ct-orange px-4 py-2 text-xs font-bold text-black uppercase"
        >
          Add artist
        </button>
      </form>

      {message && <p className="mt-4 text-sm text-neutral-600">{message}</p>}

      {fixArtist && (
        <SpotifyFixPanel
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
