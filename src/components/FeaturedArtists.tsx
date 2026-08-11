import { Carousel } from './Carousel'
import { SectionHeader } from './SectionHeader'
import { featuredArtists } from '../data/content'

export function FeaturedArtists() {
  return (
    <section id="artists" className="bg-white pb-14 md:pb-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader title="FEATURED ARTISTS" href="/new-artists" />
        <Carousel ariaLabel="Featured artists">
          {featuredArtists.map((artist) => (
            <a
              key={artist.id}
              href="/new-artists"
              className="group flex w-[140px] shrink-0 snap-start flex-col items-center text-center sm:w-[160px]"
            >
              <div className="aspect-square w-full rounded-full border border-ct-border bg-[#f3f3f3] transition-colors group-hover:border-black" />
              <h3 className="mt-4 text-sm font-extrabold tracking-tight uppercase">
                {artist.name}
              </h3>
              <p className="mt-1 text-xs text-black/60">{artist.genre}</p>
            </a>
          ))}
        </Carousel>
      </div>
    </section>
  )
}
