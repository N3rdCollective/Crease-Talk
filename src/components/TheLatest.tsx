import { Carousel } from './Carousel'
import { SectionHeader } from './SectionHeader'
import { VideoCard } from './VideoCard'
import { latestVideos } from '../data/content'

export function TheLatest() {
  return (
    <section id="latest" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader title="THE LATEST" href="#latest" />
        <Carousel ariaLabel="Latest videos">
          {latestVideos.map((item) => (
            <VideoCard key={item.id} item={item} />
          ))}
        </Carousel>
      </div>
    </section>
  )
}
