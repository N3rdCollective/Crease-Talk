import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

type StaffProfile = {
  user_id: string
  display_name: string
  handle: string | null
  title: string | null
  bio: string | null
  is_visible_to_staff: boolean
}

export function StaffPage() {
  const [rows, setRows] = useState<StaffProfile[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void supabase
      .from('staff_profiles')
      .select(
        'user_id, display_name, handle, title, bio, is_visible_to_staff',
      )
      .order('display_name')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setRows((data ?? []) as StaffProfile[])
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h2 className="text-2xl font-black tracking-tight uppercase">Staff</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Internal directory of visible staff. Hidden operators are not listed.
      </p>

      {loading && (
        <p className="mt-6 text-sm text-neutral-500">Loading staff…</p>
      )}
      {error && <p className="mt-6 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {rows.map((person) => (
          <article
            key={person.user_id}
            className="border border-neutral-200 bg-white p-5"
          >
            <p className="text-[10px] font-bold tracking-[0.18em] text-ct-orange uppercase">
              {person.handle ? `@${person.handle}` : 'Staff'}
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight uppercase">
              {person.display_name}
            </h3>
            {person.title && (
              <p className="mt-1 text-sm font-semibold text-neutral-700">
                {person.title}
              </p>
            )}
            {person.bio && (
              <p className="mt-3 text-sm text-neutral-600">{person.bio}</p>
            )}
          </article>
        ))}
      </div>

      {!loading && !error && rows.length === 0 && (
        <p className="mt-6 text-sm text-neutral-500">No staff profiles yet.</p>
      )}
    </div>
  )
}
