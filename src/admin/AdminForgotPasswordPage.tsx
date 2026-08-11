import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '../lib/auth'

export function AdminForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await requestPasswordReset(email)
      setSent(true)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not send reset email',
      )
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
          Forgot password
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your staff email and we’ll send a reset link.
        </p>

        {sent ? (
          <div className="mt-8 space-y-4">
            <p className="text-sm text-emerald-400">
              If an account exists for that email, a reset link is on its way.
              Check your inbox (and spam).
            </p>
            <Link
              to="/admin/login"
              className="inline-block text-xs font-bold tracking-wide text-ct-orange uppercase"
            >
              Back to login
            </Link>
          </div>
        ) : (
          <>
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

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full bg-ct-orange py-3 text-xs font-extrabold tracking-wider text-black uppercase disabled:opacity-60"
            >
              {loading ? 'Sending…' : 'Send reset link'}
            </button>

            <Link
              to="/admin/login"
              className="mt-4 inline-block text-xs font-semibold text-white/60 uppercase hover:text-white"
            >
              Back to login
            </Link>
          </>
        )}
      </form>
    </div>
  )
}
