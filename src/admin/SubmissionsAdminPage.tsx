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
  genre: string | null
  instagram_url: string | null
  spotify_url: string | null
  audio_file_path: string | null
  audio_file_url: string | null
  cover_file_path: string | null
  notes: string | null
  status: 'pending' | 'under_review' | 'approved' | 'rejected'
  created_at: string
}

type SignedBundle = { audio?: string; cover?: string }

export function SubmissionsAdminPage() {
  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [signed, setSigned] = useState<Record<string, SignedBundle>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('music_submissions')
      .select(
        'id, artist_name, track_title, contact_email, genre, instagram_url, spotify_url, audio_file_path, audio_file_url, cover_file_path, notes, status, created_at',
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
      const next: Record<string, SignedBundle> = {}
      for (const row of rows) {
        const bundle: SignedBundle = {}
        if (row.audio_file_path) {
          const { data } = await supabase.storage
            .from('music-submissions')
            .createSignedUrl(row.audio_file_path, 3600)
          if (data?.signedUrl) bundle.audio = data.signedUrl
        }
        if (row.cover_file_path) {
          const { data } = await supabase.storage
            .from('music-submissions')
            .createSignedUrl(row.cover_file_path, 3600)
          if (data?.signedUrl) bundle.cover = data.signedUrl
        }
        next[row.id] = bundle
      }
      if (!cancelled) setSigned(next)
    }
    void sign()
    return () => {
      cancelled = true
    }
  }, [rows])

  const setStatus = async (id: string, status: Submission['status']) => {
    setBusyId(id)
    setMessage(null)
    const { error } = await supabase
      .from('music_submissions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) setMessage(error.message)
    else await load()
    setBusyId(null)
  }

  const approve = async (id: string) => {
    setBusyId(id)
    setMessage(null)
    const { data, error } = await supabase.functions.invoke(
      'promote-submission',
      { body: { submissionId: id } },
    )
    if (error) setMessage(error.message)
    else setMessage(`Approved & promoted — media ${data?.mediaAssetId ?? ''}`)
    await load()
    setBusyId(null)
  }

  const columns = useMemo<ColumnDef<Submission>[]>(
    () => [
      {
        id: 'cover',
        header: '',
        cell: ({ row }) => {
          const cover = signed[row.original.id]?.cover
          return cover ? (
            <img src={cover} alt="" className="h-12 w-12 object-cover" />
          ) : (
            <div className="h-12 w-12 bg-neutral-200" />
          )
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Received',
        cell: ({ getValue }) =>
          new Date(getValue<string>()).toLocaleDateString(),
      },
      {
        id: 'meta',
        header: 'Submission',
        cell: ({ row }) => (
          <div className="min-w-[160px]">
            <p className="font-bold">{row.original.track_title}</p>
            <p className="text-xs text-neutral-600">
              {row.original.artist_name}
              {row.original.genre ? ` · ${row.original.genre}` : ''}
            </p>
            <p className="text-[11px] text-neutral-500">
              {row.original.contact_email}
            </p>
          </div>
        ),
      },
      {
        id: 'socials',
        header: 'Links',
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 text-[10px] font-bold uppercase">
            {row.original.instagram_url && (
              <a
                href={row.original.instagram_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ct-orange"
              >
                IG
              </a>
            )}
            {row.original.spotify_url && (
              <a
                href={row.original.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-ct-orange"
              >
                Spotify
              </a>
            )}
            {!row.original.instagram_url && !row.original.spotify_url && (
              <span className="text-neutral-400">—</span>
            )}
          </div>
        ),
      },
      {
        id: 'audio',
        header: 'Preview',
        cell: ({ row }) => {
          const url =
            signed[row.original.id]?.audio || row.original.audio_file_url
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
        cell: ({ row }) => {
          const busy = busyId === row.original.id
          return (
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={busy}
                className="rounded bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white uppercase disabled:opacity-50"
                onClick={() => void approve(row.original.id)}
              >
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                className="rounded bg-red-600 px-2 py-1 text-[10px] font-bold text-white uppercase disabled:opacity-50"
                onClick={() => void setStatus(row.original.id, 'rejected')}
              >
                Reject
              </button>
            </div>
          )
        },
      },
    ],
    [signed, busyId],
  )

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight uppercase">
        A&R review queue
      </h2>
      <p className="mt-1 text-sm text-neutral-500">
        Cover art, inline audio, and one-click approve/reject for incoming
        submissions.
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
