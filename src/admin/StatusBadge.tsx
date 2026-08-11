const styles: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-900',
  under_review: 'bg-sky-100 text-sky-900',
  approved: 'bg-emerald-100 text-emerald-900',
  rejected: 'bg-red-100 text-red-900',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
        styles[status] ?? 'bg-neutral-100 text-neutral-700'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  )
}
