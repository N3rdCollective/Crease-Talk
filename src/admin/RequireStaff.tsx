import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase/client'
import { isStaffUser } from '../lib/auth'

export function RequireStaff({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    let mounted = true
    void supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [])

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 text-sm text-neutral-500">
        Checking session…
      </div>
    )
  }

  if (!user || !isStaffUser(user)) {
    return <Navigate to="/admin/login" replace />
  }

  return <>{children}</>
}
