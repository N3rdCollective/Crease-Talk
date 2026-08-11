import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase/client'

export type StaffRole = 'webmaster' | 'admin' | 'staff'

export function getUserRole(user: User | null | undefined): StaffRole | null {
  const role = user?.app_metadata?.role
  if (role === 'webmaster' || role === 'admin' || role === 'staff') return role
  return null
}

export function isStaffUser(user: User | null | undefined): boolean {
  return getUserRole(user) !== null
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function getCurrentUser(): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function signInWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  if (!isStaffUser(data.user)) {
    await supabase.auth.signOut()
    throw new Error('This account is not authorized for admin access.')
  }
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

function authRedirect(path: string) {
  const base = window.location.origin.replace(/\/$/, '')
  return `${base}${path}`
}

/** Send password-reset email (forgot password). */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: authRedirect('/admin/reset-password'),
  })
  if (error) throw error
}

/** Change password while signed in (verifies current password first). */
export async function changePassword(options: {
  currentPassword: string
  newPassword: string
}) {
  const user = await getCurrentUser()
  if (!user?.email) throw new Error('Not signed in.')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: options.currentPassword,
  })
  if (signInError) {
    throw new Error('Current password is incorrect.')
  }

  const { error } = await supabase.auth.updateUser({
    password: options.newPassword,
  })
  if (error) throw error
}

/** Set a new password after recovery link (or while recovery session active). */
export async function setNewPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) throw error
}

/** Request email change — Supabase emails the new address to confirm. */
export async function changeEmail(options: {
  currentPassword: string
  newEmail: string
}) {
  const user = await getCurrentUser()
  if (!user?.email) throw new Error('Not signed in.')

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: options.currentPassword,
  })
  if (signInError) {
    throw new Error('Current password is incorrect.')
  }

  const { error } = await supabase.auth.updateUser(
    { email: options.newEmail.trim() },
    { emailRedirectTo: authRedirect('/admin/account') },
  )
  if (error) throw error
}
