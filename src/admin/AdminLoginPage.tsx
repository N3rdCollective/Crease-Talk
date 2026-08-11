import { useEffect, useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { getSession, isStaffUser, signInWithPassword } from '../lib/auth'
import { supabase } from '../lib/supabase/client'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    void getSession().then(async (session) => {
      if (session?.user && isStaffUser(session.user)) {
        setAuthed(true)
      } else if (session?.user) {
        await supabase.auth.signOut()
      }
      setChecking(false)
    })
  }, [])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-sm text-white/60">
        Loading…
      </div>
    )
  }

  if (authed) return <Navigate to="/admin" replace />

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await signInWithPassword(email.trim(), password)
      navigate('/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-white/15 bg-neutral-950 p-8 text-white"
      >
        <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
          CreaseTalk
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight uppercase italic">
          Admin Login
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Staff access only. Phantom operator welcome.
        </p>

        <label className="mt-8 block text-xs font-bold tracking-wide uppercase">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-2 w-full border border-white/20 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-ct-orange"
          />
        </label>

        <label className="mt-4 block text-xs font-bold tracking-wide uppercase">
          Password
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full border border-white/20 bg-black px-3 py-2 text-sm font-normal normal-case tracking-normal text-white outline-none focus:border-ct-orange"
          />
        </label>

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full bg-ct-orange py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-60"
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>

        <Link
          to="/admin/forgot-password"
          className="mt-4 inline-block text-xs font-semibold text-white/60 uppercase hover:text-ct-orange"
        >
          Forgot password?
        </Link>
      </form>
    </div>
  )
}
