import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

type PageHeaderProps = {
  title: string
  description: string
  backTo?: string
}

export function PageHeader({
  title,
  description,
  backTo = '/#discover',
}: PageHeaderProps) {
  return (
    <>
      <Link
        to={backTo}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold tracking-wide uppercase transition-colors hover:text-ct-orange"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        Back
      </Link>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight uppercase md:text-4xl">
          {title}
        </h1>
        <div className="mt-2 h-[3px] w-12 bg-ct-orange" />
        <p className="mt-4 max-w-xl text-sm text-black/65 md:text-base">
          {description}
        </p>
      </div>
    </>
  )
}
