import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { StatusBadge } from './StatusBadge'
import { supabase } from '../lib/supabase/client'

type Submission = {
  id: string
  artist_name: string
  track_title: string
  contact_email: string
  audio_file_path: string | null
  audio_file_url: string | null
  notes: string | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  created_at: string
}

export function SubmissionsAdminPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('music_submissions')
      .select(
        'id, artist_name, track_title, contact_email, audio_file_path, audio_file_url, notes, status, created_at',
      )
      .order('created_at', { ascending: false })
    if (error) setMessage(error.message)
    else setRows((data ?? []) as Submission[])
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    async function sign() {
      const next: Record<string, string> = {}
      for (const row of rows) {
        if (!row.audio_file_path) continue
        const { data } = await supabase.storage
          .from('music-submissions')
          .createSignedUrl(row.audio_file_path, 3600)
        if (data?.signedUrl) next[row.id] = data.signedUrl
      }
      if (!cancelled) setSignedUrls(next)
    }
    void sign()
    return () => {
      cancelled = true
    }
  }, [rows])

  const setStatus = async (
    id: string,
    status: Submission['status'],
  ) => {
    const { error } = await supabase
      .from('music_submissions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) setMessage(error.message)
    else await load()
  }

  const promote = async (id: string) => {
    setMessage(null)
    const { data, error } = await supabase.functions.invoke(
      'promote-submission',
      { body: { submissionId: id } },
    )
    if (error) {
      setMessage(error.message)
      return
    }
    setMessage(`Promoted — media ${data?.mediaAssetId ?? ''}`)
    await load()
  }

  const columns = useMemo<ColumnDef<Submission>[]>(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Received',
        cell: ({ getValue }) =>
          new Date(getValue<string>()).toLocaleString(),
      },
      { accessorKey: 'artist_name', header: 'Artist' },
      { accessorKey: 'track_title', header: 'Track' },
      { accessorKey: 'contact_email', header: 'Email' },
      {
        id: 'audio',
        header: 'Preview',
        cell: ({ row }) => {
          const url = signedUrls[row.original.id] || row.original.audio_file_url
          if (!url) return <span className="text-neutral-400">—</span>
          return (
            <audio controls preload="none" className="h-8 max-w-[220px]">
              <source src={url} />
            </audio>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className="rounded bg-sky-600 px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => void setStatus(row.original.id, 'under_review')}
            >
              Review
            </button>
            <button
              type="button"
              className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => void promote(row.original.id)}
            >
              Promote
            </button>
            <button
              type="button"
              className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white uppercase"
              onClick={() => void setStatus(row.original.id, 'rejected')}
            >
              Reject
            </button>
          </div>
        ),
      },
    ],
    [signedUrls],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight uppercase">
        Music submissions
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Review audio, update status, or one-click promote into the catalog.
      </p>
      {message && <p className="mt-4 text-sm text-neutral-600">{message}</p>}

      <div className="mt-6 overflow-x-auto border border-neutral-200 bg-white">
        {loading ? (
          <p className="p-6 text-sm text-neutral-500">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No submissions yet.</p>
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
