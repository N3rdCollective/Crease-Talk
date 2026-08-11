import { useState } from 'react'
import { PageHeader } from '../components/PageHeader'
import { SubmitMusicModal } from '../components/SubmitMusicModal'

export function SubmitPage() {
  const [open, setOpen] = useState(true)

  return (
    <section className="bg-white py-10 md:py-14">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        <PageHeader
          title="SUBMIT MUSIC"
          description="Independent artists can send tracks directly to CreaseTalk A&R. Audio and cover art stay private until staff approve."
        />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-8 bg-black px-6 py-3 text-xs font-extrabold tracking-wider text-white uppercase"
        >
          Open submission form
        </button>
      </div>

      <SubmitMusicModal open={open} onClose={() => setOpen(false)} />
    </section>
  )
}
