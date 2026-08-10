import { SectionHeader } from './SectionHeader'
import { VideoCard } from './VideoCard'
import { interviews } from '../data/content'

export function LatestInterviews() {
  return (
    <section id="interviews" className="bg-white py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <SectionHeader title="LATEST INTERVIEWS" href="#interviews" />
        <div className="scrollbar-hide flex snap-x snap-mandatory gap-4 overflow-x-auto md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-4 lg:gap-5">
          {interviews.map((item) => (
            <VideoCard key={item.id} item={item} variant="wide" />
          ))}
        </div>
      </div>
    </section>
  )
}
