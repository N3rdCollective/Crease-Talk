import { Link } from 'react-router-dom'

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
  const className =
    'shrink-0 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange md:text-sm'
  const isExternal = href.startsWith('http')
  const isRoute = href.startsWith('/') && !href.startsWith('/#')

  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight uppercase md:text-3xl">
          {title}
        </h2>
        <div className="mt-2 h-[3px] w-12 bg-ct-orange" />
      </div>
      {isRoute ? (
        <Link to={href} className={className}>
          {linkLabel}
        </Link>
      ) : (
        <a
          href={href}
          {...(isExternal
            ? { target: '_blank', rel: 'noopener noreferrer' }
            : {})}
          className={className}
        >
          {linkLabel}
        </a>
      )}
    </div>
  )
}
