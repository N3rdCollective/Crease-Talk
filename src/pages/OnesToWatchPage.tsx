import { VideoGridPage } from '../components/VideoGridPage'

export function OnesToWatchPage() {
  return (
    <VideoGridPage
      title="ONES TO WATCH"
      description="Ranked by most views — artists and performances on the rise."
      sortBy="views"
      showViews
      backTo="/#discover"
    />
  )
}
