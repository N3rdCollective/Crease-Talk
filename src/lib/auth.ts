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
