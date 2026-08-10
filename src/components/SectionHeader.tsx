type SectionHeaderProps = {
  title: string
  href?: string
  linkLabel?: string
}

export function SectionHeader({
  title,
  href = '#',
  linkLabel = 'VIEW ALL →',
}: SectionHeaderProps) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight uppercase md:text-3xl">
          {title}
        </h2>
        <div className="mt-2 h-[3px] w-12 bg-ct-orange" />
      </div>
      <a
        href={href}
        {...(href.startsWith('http')
          ? { target: '_blank', rel: 'noopener noreferrer' }
          : {})}
        className="shrink-0 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange md:text-sm"
      >
        {linkLabel}
      </a>
    </div>
  )
}
