import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import { StatusBadge } from './StatusBadge'
import {
  batchUpdateMediaStatus,
  fetchAllMediaForAdmin,
  runYouTubeIngest,
  updateMediaAsset,
  type MediaAsset,
} from '../lib/media'
import { supabase } from '../lib/supabase/client'

type ArtistOption = { id: string; name: string }

export function VideoQueuePage() {
  const [rows, setRows] = useState<MediaAsset[]>([])
  const [artists, setArtists] = useState<ArtistOption[]>([])
  const [filter, setFilter] = useState<'all' | MediaAsset['approval_status']>(
    'pending',
  )
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [media, artistRows] = await Promise.all([
        fetchAllMediaForAdmin(filter === 'all' ? undefined : filter),
        supabase.from('artists').select('id, name').order('name'),
      ])
      setRows(media)
      setArtists((artistRows.data ?? []) as ArtistOption[])
      setRowSelection({})
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to load queue')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void load()
  }, [load])

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: 'thumbnail_url',
        header: '',
        cell: ({ row }) =>
          row.original.thumbnail_url ? (
            <img
              src={row.original.thumbnail_url}
              alt=""
              className="h-12 w-20 object-cover"
            />
          ) : (
            <div className="h-12 w-20 bg-neutral-200" />
          ),
      },
      {
        accessorKey: 'title',
        header: 'Title',
        cell: ({ row }) => (
          <input
            className="w-full min-w-[160px] border border-neutral-200 bg-white px-2 py-1 text-sm"
            defaultValue={row.original.title}
            onBlur={(e) => {
              const title = e.target.value.trim()
              if (title && title !== row.original.title) {
                void updateMediaAsset(row.original.id, { title }).then(load)
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'parsed_artist_name',
        header: 'Parsed artist',
        cell: ({ row }) => (
          <input
            className="w-full min-w-[120px] border border-neutral-200 bg-white px-2 py-1 text-sm"
            defaultValue={row.original.parsed_artist_name ?? ''}
            onBlur={(e) => {
              const parsed_artist_name = e.target.value.trim()
              if (parsed_artist_name !== (row.original.parsed_artist_name ?? '')) {
                void updateMediaAsset(row.original.id, {
                  parsed_artist_name,
                }).then(load)
              }
            }}
          />
        ),
      },
      {
        accessorKey: 'artist_id',
        header: 'Artist link',
        cell: ({ row }) => (
          <select
            className="max-w-[160px] border border-neutral-200 bg-white px-2 py-1 text-sm"
            value={row.original.artist_id ?? ''}
            onChange={(e) => {
              const artist_id = e.target.value || null
              void updateMediaAsset(row.original.id, {
                artist_id,
              }).then(load)
            }}
          >
            <option value="">—</option>
            {artists.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: ({ row }) => (
          <select
            className="border border-neutral-200 bg-white px-2 py-1 text-sm"
            value={row.original.category}
            onChange={(e) => {
              void updateMediaAsset(row.original.id, {
                category: e.target.value as MediaAsset['category'],
              }).then(load)
            }}
          >
            <option value="performance">performance</option>
            <option value="interview">interview</option>
            <option value="other">other</option>
          </select>
        ),
      },
      {
        accessorKey: 'approval_status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.approval_status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => {
                void updateMediaAsset(row.original.id, {
                  approval_status: 'approved',
                }).then(load)
              }}
            >
              Approve
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => {
                void updateMediaAsset(row.original.id, {
                  approval_status: 'rejected',
                }).then(load)
              }}
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    [artists, load],
  )

  const table = useReactTable({
    data: rows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  const selectedIds = table
    .getSelectedRowModel()
    .rows.map((r) => r.original.id)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Video review queue
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ingested YouTube videos await approval before going live.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filter}
            onChange={(e) =>
              setFilter(e.target.value as typeof filter)
            }
            className="border border-neutral-300 bg-white px-3 py-2 text-sm"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="all">All</option>
          </select>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => {
              setBusy('ingest')
              setMessage(null)
              void runYouTubeIngest()
                .then((res) => {
                  setMessage(
                    `Ingest complete — inserted ${res?.inserted ?? 0}, updated ${res?.updated ?? 0}`,
                  )
                  return load()
                })
                .catch((err: unknown) => {
                  setMessage(
                    err instanceof Error ? err.message : 'Ingest failed',
                  )
                })
                .finally(() => setBusy(null))
            }}
            className="bg-black px-4 py-2 text-xs font-bold tracking-wide text-white uppercase disabled:opacity-50"
          >
            {busy === 'ingest' ? 'Ingesting…' : 'Run ingest now'}
          </button>
          <button
            type="button"
            disabled={!selectedIds.length || Boolean(busy)}
            onClick={() => {
              setBusy('batch')
              void batchUpdateMediaStatus(selectedIds, 'approved')
                .then(load)
                .finally(() => setBusy(null))
            }}
            className="bg-emerald-600 px-4 py-2 text-xs font-bold tracking-wide text-white uppercase disabled:opacity-50"
          >
            Bulk approve ({selectedIds.length})
          </button>
        </div>
      </div>

      {message && (
        <p className="mt-4 text-sm text-neutral-600">{message}</p>
      )}

      <div className="mt-6 overflow-x-auto border border-neutral-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-neutral-500">Loading queue…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">
            No videos in this filter. Run ingest to pull from YouTube.
          </p>
        ) : (
          <table className="min-w-full text-left text-sm">
            <thead className="bg-black text-xs tracking-wide text-white uppercase">
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id} className="px-3 py-2 font-bold">
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
                    <td key={cell.id} className="px-3 py-2 align-middle">
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
