import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { TheLatest } from './components/TheLatest'
import { Discover } from './components/Discover'
import { FeaturedArtists } from './components/FeaturedArtists'
import { Radio } from './components/Radio'
import { LatestInterviews } from './components/LatestInterviews'
import { Footer } from './components/Footer'

export default function App() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <Hero />
        <TheLatest />
        <Discover />
        <FeaturedArtists />
        <Radio />
        <LatestInterviews />
      </main>
      <Footer />
    </div>
  )
}
