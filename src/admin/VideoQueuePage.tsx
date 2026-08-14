import { useCallback, useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type RowSelectionState,
} from '@tanstack/react-table'
import {
  Check,
  Clapperboard,
  LayoutGrid,
  List,
  Loader2,
  Play,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { useAdminToast } from './AdminToast'
import {
  batchUpdateMediaStatus,
  fetchAllMediaForAdmin,
  runYouTubeIngest,
  updateMediaAsset,
  type MediaAsset,
} from '../lib/media'
import {
  fetchVideoQueueStats,
  formatDuration,
  formatRelativeTime,
  type VideoQueueStats,
} from '../lib/adminStats'
import { supabase } from '../lib/supabase/client'

type ArtistOption = { id: string; name: string; is_verified?: boolean }
type FilterKey = 'all' | MediaAsset['approval_status']
type ViewMode = 'table' | 'grid'

type AdminOutlet = { refreshNavCounts?: () => void }

const channelHandle =
  import.meta.env.VITE_YOUTUBE_CHANNEL_HANDLE?.replace(/^@/, '') || 'creasetalk'

export function VideoQueuePage() {
  const { refreshNavCounts } = useOutletContext<AdminOutlet>()
  const toast = useAdminToast()

  const [rows, setRows] = useState<MediaAsset[]>([])
  const [artists, setArtists] = useState<ArtistOption[]>([])
  const [stats, setStats] = useState<VideoQueueStats | null>(null)
  const [filter, setFilter] = useState<FilterKey>('pending')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<ViewMode>('table')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'ingest' | 'batch' | null>(null)
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [media, artistRows, nextStats] = await Promise.all([
        fetchAllMediaForAdmin(),
        supabase
          .from('artists')
          .select('id, name, is_verified')
          .order('name'),
        fetchVideoQueueStats(),
      ])
      setRows(media)
      setArtists((artistRows.data ?? []) as ArtistOption[])
      setStats(nextStats)
      setRowSelection({})
      refreshNavCounts?.()
    } catch (err) {
      toast.push(
        err instanceof Error ? err.message : 'Failed to load queue',
        'error',
      )
    } finally {
      setLoading(false)
    }
  }, [refreshNavCounts, toast])

  useEffect(() => {
    void load()
  }, [load])

  const artistById = useMemo(() => {
    const map = new Map<string, ArtistOption>()
    for (const a of artists) map.set(a.id, a)
    return map
  }, [artists])

  const counts = useMemo(
    () => ({
      all: stats?.total ?? rows.length,
      pending: stats?.pending ?? 0,
      approved: stats?.totalApproved ?? 0,
      rejected: stats?.rejected ?? 0,
    }),
    [rows.length, stats],
  )

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((row) => {
      if (filter !== 'all' && row.approval_status !== filter) return false
      if (!q) return true
      return (
        row.title.toLowerCase().includes(q) ||
        (row.parsed_artist_name ?? '').toLowerCase().includes(q) ||
        (row.youtube_video_id ?? '').toLowerCase().includes(q) ||
        (row.artist_id
          ? (artistById.get(row.artist_id)?.name ?? '').toLowerCase().includes(q)
          : false)
      )
    })
  }, [artistById, filter, rows, search])

  const patchRow = useCallback(
    async (id: string, patch: Parameters<typeof updateMediaAsset>[1]) => {
      const updated = await updateMediaAsset(id, patch)
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)))
      if (patch.approval_status) {
        const next = await fetchVideoQueueStats()
        setStats(next)
        refreshNavCounts?.()
      }
    },
    [refreshNavCounts],
  )

  const columns = useMemo<ColumnDef<MediaAsset>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <input
            type="checkbox"
            aria-label="Select all"
            checked={table.getIsAllPageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
          />
        ),
        cell: ({ row }) => (
          <input
            type="checkbox"
            aria-label="Select row"
            checked={row.getIsSelected()}
            onChange={row.getToggleSelectedHandler()}
          />
        ),
      },
      {
        accessorKey: 'thumbnail_url',
        header: 'Thumbnail',
        cell: ({ row }) => (
          <a
            href={
              row.original.youtube_video_id
                ? `https://www.youtube.com/watch?v=${row.original.youtube_video_id}`
                : undefined
            }
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block h-12 w-20 overflow-hidden bg-neutral-200"
          >
            {row.original.thumbnail_url ? (
              <img
                src={row.original.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
              <Play className="size-4 fill-white text-white" />
            </span>
          </a>
        ),
      },
      {
        id: 'title_artist',
        header: 'Video / Artist',
        cell: ({ row }) => {
          const linked = row.original.artist_id
            ? artistById.get(row.original.artist_id)
            : null
          return (
            <div className="min-w-[220px] space-y-1">
              <input
                className="w-full border border-transparent bg-transparent px-1 py-0.5 text-sm font-semibold hover:border-neutral-200 focus:border-neutral-400 focus:bg-white focus:outline-none"
                defaultValue={row.original.title}
                key={`${row.original.id}-title-${row.original.title}`}
                onBlur={(e) => {
                  const title = e.target.value.trim()
                  if (title && title !== row.original.title) {
                    void patchRow(row.original.id, { title })
                  }
                }}
              />
              <input
                className="w-full border border-transparent bg-transparent px-1 py-0.5 text-xs text-neutral-600 hover:border-neutral-200 focus:border-neutral-400 focus:bg-white focus:outline-none"
                defaultValue={row.original.parsed_artist_name ?? ''}
                key={`${row.original.id}-artist-${row.original.parsed_artist_name}`}
                placeholder="Artist name"
                onBlur={(e) => {
                  const parsed_artist_name = e.target.value.trim()
                  if (
                    parsed_artist_name !==
                    (row.original.parsed_artist_name ?? '')
                  ) {
                    void patchRow(row.original.id, { parsed_artist_name })
                  }
                }}
              />
              {linked && (
                <p className="px-1 text-[10px] font-bold tracking-wide text-emerald-700 uppercase">
                  Matched: {linked.name}
                  {linked.is_verified ? ' · Verified' : ''}
                </p>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: 'artist_id',
        header: 'Link',
        cell: ({ row }) => (
          <select
            className="max-w-[150px] border border-neutral-200 bg-white px-2 py-1 text-xs"
            value={row.original.artist_id ?? ''}
            onChange={(e) => {
              void patchRow(row.original.id, {
                artist_id: e.target.value || null,
              })
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
            className="border border-neutral-200 bg-white px-2 py-1 text-xs"
            value={row.original.category}
            onChange={(e) => {
              void patchRow(row.original.id, {
                category: e.target.value as MediaAsset['category'],
              })
            }}
          >
            <option value="performance">performance</option>
            <option value="interview">interview</option>
            <option value="other">other</option>
          </select>
        ),
      },
      {
        accessorKey: 'duration_seconds',
        header: 'Length',
        cell: ({ row }) => (
          <span className="text-xs text-neutral-500">
            {formatDuration(row.original.duration_seconds)}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Ingested',
        cell: ({ row }) => (
          <span className="text-xs text-neutral-500">
            {formatRelativeTime(row.original.created_at)}
          </span>
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
              title="Approve"
              className="rounded bg-emerald-600 p-1.5 text-white hover:bg-emerald-700"
              onClick={() => {
                void patchRow(row.original.id, {
                  approval_status: 'approved',
                }).then(() => toast.push('Video approved', 'success'))
              }}
            >
              <Check className="size-3.5" strokeWidth={3} />
            </button>
            <button
              type="button"
              title="Reject"
              className="rounded bg-red-600 p-1.5 text-white hover:bg-red-700"
              onClick={() => {
                void patchRow(row.original.id, {
                  approval_status: 'rejected',
                }).then(() => toast.push('Video rejected', 'info'))
              }}
            >
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </div>
        ),
      },
    ],
    [artistById, artists, patchRow, toast],
  )

  const table = useReactTable({
    data: filteredRows,
    columns,
    state: { rowSelection },
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
  })

  const selectedIds = table.getSelectedRowModel().rows.map((r) => r.original.id)

  async function onIngest() {
    setBusy('ingest')
    toast.push('Syncing YouTube channel…')
    try {
      const res = await runYouTubeIngest()
      const inserted = res?.inserted ?? 0
      const updated = res?.updated ?? 0
      toast.push(
        `Ingest complete — ${inserted} new, ${updated} updated.`,
        'success',
      )
      await load()
    } catch (err) {
      toast.push(err instanceof Error ? err.message : 'Ingest failed', 'error')
    } finally {
      setBusy(null)
    }
  }

  async function onBulk(status: 'approved' | 'rejected') {
    if (!selectedIds.length) return
    setBusy('batch')
    try {
      await batchUpdateMediaStatus(selectedIds, status)
      toast.push(
        `${selectedIds.length} video${selectedIds.length === 1 ? '' : 's'} marked ${status}.`,
        'success',
      )
      await load()
    } catch (err) {
      toast.push(
        err instanceof Error ? err.message : 'Bulk update failed',
        'error',
      )
    } finally {
      setBusy(null)
    }
  }

  const statusTabs: { key: FilterKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'pending', label: 'Pending', count: counts.pending },
    { key: 'approved', label: 'Approved', count: counts.approved },
    { key: 'rejected', label: 'Rejected', count: counts.rejected },
  ]

  return (
    <div className={selectedIds.length ? 'pb-24' : ''}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight uppercase">
            Video review queue
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Ingested YouTube videos awaiting review before publishing live.
          </p>
        </div>
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void onIngest()}
          className="inline-flex items-center gap-2 bg-ct-orange px-4 py-2.5 text-xs font-bold tracking-wide text-black uppercase disabled:opacity-50"
        >
          {busy === 'ingest' ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <RefreshCw className="size-3.5" />
          )}
          {busy === 'ingest' ? 'Syncing…' : 'Run ingest'}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Pending review', value: stats?.pending ?? '—' },
          { label: 'Approved today', value: stats?.approvedToday ?? '—' },
          { label: 'Total live', value: stats?.totalApproved ?? '—' },
          {
            label: 'Last ingest',
            value: formatRelativeTime(stats?.lastIngestAt),
          },
        ].map((card) => (
          <div
            key={card.label}
            className="border border-neutral-200 bg-white px-4 py-3"
          >
            <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-500 uppercase">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-black tracking-tight">
              {card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-3 border border-neutral-200 bg-white p-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search videos, artists, or YouTube ID…"
            className="w-full border border-neutral-200 py-2 pr-3 pl-10 text-sm outline-none focus:border-black"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`px-3 py-2 text-[11px] font-bold tracking-wide uppercase ${
                filter === tab.key
                  ? 'bg-black text-white'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
        <div className="flex gap-1 border border-neutral-200 p-0.5">
          <button
            type="button"
            title="Table view"
            onClick={() => setView('table')}
            className={`p-2 ${view === 'table' ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            <List className="size-4" />
          </button>
          <button
            type="button"
            title="Grid view"
            onClick={() => setView('grid')}
            className={`p-2 ${view === 'grid' ? 'bg-black text-white' : 'text-neutral-500 hover:bg-neutral-100'}`}
          >
            <LayoutGrid className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-4">
        {loading ? (
          <p className="border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
            Loading queue…
          </p>
        ) : filteredRows.length === 0 && rows.length === 0 ? (
          <div className="flex flex-col items-center border border-neutral-200 bg-white px-6 py-16 text-center">
            <Clapperboard className="size-10 text-neutral-300" strokeWidth={1.5} />
            <h3 className="mt-4 text-lg font-black tracking-tight uppercase">
              No videos indexed yet
            </h3>
            <p className="mt-2 max-w-md text-sm text-neutral-500">
              Pull the latest uploads from @{channelHandle} into the review
              queue.
            </p>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void onIngest()}
              className="mt-6 inline-flex items-center gap-2 bg-ct-orange px-5 py-3 text-xs font-bold tracking-wide text-black uppercase disabled:opacity-50"
            >
              {busy === 'ingest' ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3.5" />
              )}
              Run YouTube channel ingest →
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <p className="border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
            No videos match this filter{search ? ' / search' : ''}.
          </p>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((row) => {
              const linked = row.artist_id
                ? artistById.get(row.artist_id)
                : null
              const selected = Boolean(rowSelection[row.id])
              return (
                <article
                  key={row.id}
                  className={`border bg-white ${
                    selected ? 'border-black' : 'border-neutral-200'
                  }`}
                >
                  <div className="relative aspect-video bg-neutral-100">
                    {row.thumbnail_url ? (
                      <img
                        src={row.thumbnail_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                    <label className="absolute top-2 left-2 bg-white/90 px-2 py-1">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() =>
                          setRowSelection((prev) => {
                            const next = { ...prev }
                            if (next[row.id]) delete next[row.id]
                            else next[row.id] = true
                            return next
                          })
                        }
                      />
                    </label>
                    {row.youtube_video_id && (
                      <a
                        href={`https://www.youtube.com/watch?v=${row.youtube_video_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/30 hover:opacity-100"
                      >
                        <span className="rounded-full bg-white p-3">
                          <Play className="size-5 fill-black" />
                        </span>
                      </a>
                    )}
                    <span className="absolute top-2 right-2">
                      <StatusBadge status={row.approval_status} />
                    </span>
                  </div>
                  <div className="space-y-2 p-3">
                    <input
                      className="w-full border border-transparent px-1 text-sm font-bold hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
                      defaultValue={row.title}
                      key={`${row.id}-g-title-${row.title}`}
                      onBlur={(e) => {
                        const title = e.target.value.trim()
                        if (title && title !== row.title) {
                          void patchRow(row.id, { title })
                        }
                      }}
                    />
                    <input
                      className="w-full border border-transparent px-1 text-xs text-neutral-600 hover:border-neutral-200 focus:border-neutral-400 focus:outline-none"
                      defaultValue={row.parsed_artist_name ?? ''}
                      key={`${row.id}-g-artist-${row.parsed_artist_name}`}
                      placeholder="Artist"
                      onBlur={(e) => {
                        const parsed_artist_name = e.target.value.trim()
                        if (
                          parsed_artist_name !== (row.parsed_artist_name ?? '')
                        ) {
                          void patchRow(row.id, { parsed_artist_name })
                        }
                      }}
                    />
                    {linked && (
                      <p className="text-[10px] font-bold text-emerald-700 uppercase">
                        Matched: {linked.name}
                        {linked.is_verified ? ' · Verified' : ''}
                      </p>
                    )}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        className="flex-1 bg-emerald-600 py-2 text-[10px] font-bold text-white uppercase"
                        onClick={() => {
                          void patchRow(row.id, {
                            approval_status: 'approved',
                          }).then(() => toast.push('Video approved', 'success'))
                        }}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="flex-1 bg-red-600 py-2 text-[10px] font-bold text-white uppercase"
                        onClick={() => {
                          void patchRow(row.id, {
                            approval_status: 'rejected',
                          }).then(() => toast.push('Video rejected', 'info'))
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="overflow-x-auto border border-neutral-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-black text-xs tracking-wide text-white uppercase">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="px-3 py-2.5 font-bold">
                        {flexRender(
                          h.column.columnDef.header,
                          h.getContext(),
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-neutral-100 hover:bg-neutral-50/80"
                  >
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
          </div>
        )}
      </div>

      {selectedIds.length > 0 && (
        <div className="fixed right-4 bottom-4 left-4 z-40 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 border border-neutral-200 bg-black px-4 py-3 text-white shadow-xl lg:left-[calc(16rem+1rem)]">
          <p className="text-xs font-bold tracking-wide uppercase">
            {selectedIds.length} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy === 'batch'}
              onClick={() => void onBulk('approved')}
              className="bg-emerald-500 px-3 py-2 text-[11px] font-bold text-black uppercase disabled:opacity-50"
            >
              Approve all
            </button>
            <button
              type="button"
              disabled={busy === 'batch'}
              onClick={() => void onBulk('rejected')}
              className="bg-red-500 px-3 py-2 text-[11px] font-bold text-white uppercase disabled:opacity-50"
            >
              Mark rejected
            </button>
            <button
              type="button"
              onClick={() => setRowSelection({})}
              className="border border-white/30 px-3 py-2 text-[11px] font-bold uppercase hover:bg-white/10"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
