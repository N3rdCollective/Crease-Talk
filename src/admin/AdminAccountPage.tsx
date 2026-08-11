import { useEffect, useState, type FormEvent } from 'react'
import {
  changeEmail,
  changePassword,
  getCurrentUser,
  getUserRole,
} from '../lib/auth'
import type { User } from '@supabase/supabase-js'

export function AdminAccountPage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordBusy, setPasswordBusy] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailMsg, setEmailMsg] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailBusy, setEmailBusy] = useState(false)

  useEffect(() => {
    void getCurrentUser()
      .then((u) => {
        setUser(u)
        setNewEmail(u?.email ?? '')
      })
      .finally(() => setLoading(false))
  }, [])

  async function onChangePassword(e: FormEvent) {
    e.preventDefault()
    setPasswordMsg(null)
    setPasswordError(null)

    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.')
      return
    }

    setPasswordBusy(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordMsg('Password updated.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(
        err instanceof Error ? err.message : 'Could not update password',
      )
    } finally {
      setPasswordBusy(false)
    }
  }

  async function onChangeEmail(e: FormEvent) {
    e.preventDefault()
    setEmailMsg(null)
    setEmailError(null)

    const trimmed = newEmail.trim()
    if (!trimmed || trimmed === user?.email) {
      setEmailError('Enter a new email address.')
      return
    }

    setEmailBusy(true)
    try {
      await changeEmail({
        currentPassword: emailPassword,
        newEmail: trimmed,
      })
      setEmailMsg(
        'Check your new inbox to confirm the email change. Your login email updates after you confirm.',
      )
      setEmailPassword('')
    } catch (err) {
      setEmailError(
        err instanceof Error ? err.message : 'Could not update email',
      )
    } finally {
      setEmailBusy(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-neutral-500">Loading account…</p>
  }

  const role = getUserRole(user)

  return (
    <div className="max-w-xl">
      <h2 className="text-2xl font-black tracking-tight uppercase">Account</h2>
      <p className="mt-1 text-sm text-neutral-500">
        Update your login email or password.
      </p>

      <div className="mt-6 border border-neutral-200 bg-white p-5">
        <p className="text-[10px] font-bold tracking-wide text-neutral-500 uppercase">
          Signed in as
        </p>
        <p className="mt-1 text-sm font-semibold">{user?.email}</p>
        {role && (
          <p className="mt-1 text-xs capitalize text-neutral-500">
            Role: {role}
          </p>
        )}
      </div>

      <form
        onSubmit={onChangePassword}
        className="mt-8 space-y-3 border border-neutral-200 bg-white p-5"
      >
        <h3 className="text-sm font-black tracking-wide uppercase">
          Change password
        </h3>
        <label className="block text-xs font-bold uppercase">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-normal normal-case"
          />
        </label>
        <label className="block text-xs font-bold uppercase">
          New password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-normal normal-case"
          />
        </label>
        <label className="block text-xs font-bold uppercase">
          Confirm new password
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-normal normal-case"
          />
        </label>
        {passwordError && (
          <p className="text-sm text-red-600">{passwordError}</p>
        )}
        {passwordMsg && (
          <p className="text-sm text-emerald-700">{passwordMsg}</p>
        )}
        <button
          type="submit"
          disabled={passwordBusy}
          className="bg-black px-4 py-2 text-xs font-bold text-white uppercase disabled:opacity-50"
        >
          {passwordBusy ? 'Saving…' : 'Update password'}
        </button>
      </form>

      <form
        onSubmit={onChangeEmail}
        className="mt-6 space-y-3 border border-neutral-200 bg-white p-5"
      >
        <h3 className="text-sm font-black tracking-wide uppercase">
          Change email
        </h3>
        <p className="text-xs text-neutral-500">
          We’ll send a confirmation link to the new address before it becomes
          your login email.
        </p>
        <label className="block text-xs font-bold uppercase">
          New email
          <input
            type="email"
            required
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-normal normal-case"
          />
        </label>
        <label className="block text-xs font-bold uppercase">
          Current password
          <input
            type="password"
            required
            autoComplete="current-password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            className="mt-1 w-full border border-neutral-300 px-3 py-2 text-sm font-normal normal-case"
          />
        </label>
        {emailError && <p className="text-sm text-red-600">{emailError}</p>}
        {emailMsg && <p className="text-sm text-emerald-700">{emailMsg}</p>}
        <button
          type="submit"
          disabled={emailBusy}
          className="bg-black px-4 py-2 text-xs font-bold text-white uppercase disabled:opacity-50"
        >
          {emailBusy ? 'Sending…' : 'Request email change'}
        </button>
      </form>
    </div>
  )
}
