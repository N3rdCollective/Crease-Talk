import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isStaffUser, setNewPassword } from '../lib/auth'
import { supabase } from '../lib/supabase/client'

export function AdminResetPasswordPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const [invalid, setInvalid] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let settled = false

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (settled) return
      if (event === 'PASSWORD_RECOVERY' || (session?.user && event === 'SIGNED_IN')) {
        settled = true
        setReady(true)
      }
    })

    void supabase.auth.getSession().then(({ data }) => {
      if (settled) return
      if (data.session?.user) {
        settled = true
        setReady(true)
      } else {
        // Give hash tokens a moment to be processed
        window.setTimeout(() => {
          if (settled) return
          void supabase.auth.getSession().then(({ data: again }) => {
            if (again.session?.user) {
              settled = true
              setReady(true)
            } else {
              settled = true
              setInvalid(true)
            }
          })
        }, 800)
      }
    })

    return () => {
      sub.subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await setNewPassword(password)
      const { data } = await supabase.auth.getUser()
      if (data.user && !isStaffUser(data.user)) {
        await supabase.auth.signOut()
        throw new Error('This account is not authorized for admin access.')
      }
      setDone(true)
      window.setTimeout(() => navigate('/admin'), 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <div className="w-full max-w-md border border-white/15 bg-neutral-950 p-8 text-white">
        <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
          CreaseTalk
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight uppercase italic">
          Set new password
        </h1>

        {invalid && (
          <div className="mt-6 space-y-3">
            <p className="text-sm text-red-400">
              This reset link is invalid or expired. Request a new one.
            </p>
            <Link
              to="/admin/forgot-password"
              className="inline-block text-xs font-bold text-ct-orange uppercase"
            >
              Forgot password
            </Link>
          </div>
        )}

        {!invalid && !ready && (
          <p className="mt-6 text-sm text-white/60">Validating reset link…</p>
        )}

        {ready && !done && (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <label className="block text-xs font-bold tracking-wide uppercase">
              New password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full border border-white/20 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-ct-orange"
              />
            </label>
            <label className="block text-xs font-bold tracking-wide uppercase">
              Confirm password
              <input
                type="password"
                required
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="mt-2 w-full border border-white/20 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-ct-orange"
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-ct-orange py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-60"
            >
              {loading ? 'Saving…' : 'Save password'}
            </button>
          </form>
        )}

        {done && (
          <p className="mt-6 text-sm text-emerald-400">
            Password updated. Taking you to admin…
          </p>
        )}
      </div>
    </div>
  )
}
