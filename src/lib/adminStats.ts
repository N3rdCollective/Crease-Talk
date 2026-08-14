import { supabase } from './supabase/client'

export type AdminNavCounts = {
  pendingVideos: number
  pendingSubmissions: number
}

export type VideoQueueStats = {
  pending: number
  approvedToday: number
  totalApproved: number
  total: number
  rejected: number
  lastIngestAt: string | null
}

function startOfTodayIso() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export async function fetchAdminNavCounts(): Promise<AdminNavCounts> {
  const [videos, submissions] = await Promise.all([
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube')
      .eq('approval_status', 'pending'),
    supabase
      .from('music_submissions')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
  ])

  if (videos.error) throw videos.error
  if (submissions.error) throw submissions.error

  return {
    pendingVideos: videos.count ?? 0,
    pendingSubmissions: submissions.count ?? 0,
  }
}

export async function fetchVideoQueueStats(): Promise<VideoQueueStats> {
  const today = startOfTodayIso()
  const [
    pending,
    approvedToday,
    totalApproved,
    total,
    rejected,
    latest,
  ] = await Promise.all([
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube')
      .eq('approval_status', 'pending'),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube')
      .eq('approval_status', 'approved')
      .gte('updated_at', today),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube')
      .eq('approval_status', 'approved'),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube'),
    supabase
      .from('media_assets')
      .select('id', { count: 'exact', head: true })
      .eq('media_kind', 'youtube')
      .eq('approval_status', 'rejected'),
    supabase
      .from('media_assets')
      .select('created_at')
      .eq('media_kind', 'youtube')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  for (const res of [pending, approvedToday, totalApproved, total, rejected]) {
    if (res.error) throw res.error
  }
  if (latest.error) throw latest.error

  return {
    pending: pending.count ?? 0,
    approvedToday: approvedToday.count ?? 0,
    totalApproved: totalApproved.count ?? 0,
    total: total.count ?? 0,
    rejected: rejected.count ?? 0,
    lastIngestAt: (latest.data as { created_at: string } | null)?.created_at ?? null,
  }
}

export function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  const then = new Date(iso).getTime()
  if (!Number.isFinite(then)) return '—'
  const diffSec = Math.round((Date.now() - then) / 1000)
  if (diffSec < 60) return 'just now'
  const mins = Math.round(diffSec / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.round(mins / 60)
  if (hours < 48) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '—'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
