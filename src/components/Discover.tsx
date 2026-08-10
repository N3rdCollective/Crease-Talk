import { ArrowDown, Eye, Music2, Star, TvMinimalPlay } from 'lucide-react'
import { SectionHeader } from './SectionHeader'
import { discoverItems, type DiscoverItem } from '../data/content'

function DiscoverIcon({ icon }: { icon: DiscoverItem['icon'] }) {
  const className = 'size-8 stroke-[1.5]'
  switch (icon) {
    case 'star':
      return <Star className={className} />
    case 'music':
      return <Music2 className={className} />
    case 'video':
      return <TvMinimalPlay className={className} />
    case 'eye':
      return <Eye className={className} />
  }
}

export function Discover() {
  return (
    <section id="discover" className="bg-white pb-14 md:pb-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader title="DISCOVER" href="#discover" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {discoverItems.map((item) => (
            <a
              key={item.id}
              href={item.href}
              className="group flex min-h-[240px] flex-col items-center border border-ct-border px-6 py-8 text-center transition-colors hover:border-black"
            >
              <DiscoverIcon icon={item.icon} />
              <h3 className="mt-5 text-sm font-extrabold tracking-wide uppercase">
                {item.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-black/65">
                {item.description}
              </p>
              <ArrowDown className="mt-auto size-5 stroke-[1.5] pt-6 transition-transform group-hover:translate-y-1" />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
