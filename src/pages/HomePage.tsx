import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Hero } from '../components/Hero'
import { TheLatest } from '../components/TheLatest'
import { Discover } from '../components/Discover'
import { FeaturedArtists } from '../components/FeaturedArtists'
import { Radio } from '../components/Radio'
import { LatestInterviews } from '../components/LatestInterviews'

export function HomePage() {
  const { hash } = useLocation()

  useEffect(() => {
    if (!hash) return
    const id = hash.replace('#', '')
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash])

  return (
    <>
      <Hero />
      <TheLatest />
      <Discover />
      <FeaturedArtists />
      <Radio />
      <LatestInterviews />
    </>
  )
}
