import { useCallback, useEffect, useState } from 'react'
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Film,
  LayoutDashboard,
  LogOut,
  Menu,
  Music2,
  PanelLeftClose,
  PanelLeftOpen,
  ShoppingBag,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { getCurrentUser, signOut } from '../lib/auth'
import { fetchAdminNavCounts, type AdminNavCounts } from '../lib/adminStats'
import { AdminToastProvider } from './AdminToast'

type NavItem = {
  to: string
  label: string
  end?: boolean
  icon: typeof Film
  badgeKey?: keyof AdminNavCounts
}

const navItems: NavItem[] = [
  { to: '/admin', label: 'Video Queue', end: true, icon: Film, badgeKey: 'pendingVideos' },
  { to: '/admin/artists', label: 'Artist Profiles', icon: Users },
  {
    to: '/admin/submissions',
    label: 'Submissions',
    icon: Music2,
    badgeKey: 'pendingSubmissions',
  },
  { to: '/admin/shop', label: 'Shop', icon: ShoppingBag },
  { to: '/admin/staff', label: 'Staff', icon: LayoutDashboard },
]

const crumbLabels: Record<string, string> = {
  '/admin': 'Video Queue',
  '/admin/artists': 'Artist Profiles',
  '/admin/submissions': 'Submissions',
  '/admin/shop': 'Shop',
  '/admin/staff': 'Staff',
  '/admin/account': 'Account',
}

function badgeFor(counts: AdminNavCounts | null, key?: keyof AdminNavCounts) {
  if (!counts || !key) return null
  const n = counts[key]
  return n > 0 ? n : null
}

export function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem('ct-admin-sidebar') === 'collapsed'
    } catch {
      return false
    }
  })
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [counts, setCounts] = useState<AdminNavCounts | null>(null)

  const refreshCounts = useCallback(() => {
    void fetchAdminNavCounts()
      .then(setCounts)
      .catch(() => setCounts(null))
  }, [])

  useEffect(() => {
    void getCurrentUser().then((u) => setEmail(u?.email ?? null))
    refreshCounts()
  }, [refreshCounts])

  useEffect(() => {
    refreshCounts()
    setMobileOpen(false)
    setAccountOpen(false)
  }, [location.pathname, refreshCounts])

  useEffect(() => {
    try {
      localStorage.setItem(
        'ct-admin-sidebar',
        collapsed ? 'collapsed' : 'expanded',
      )
    } catch {
      // ignore
    }
  }, [collapsed])

  const crumb =
    crumbLabels[location.pathname] ??
    (location.pathname.startsWith('/admin/artists/')
      ? 'Edit Artist'
      : 'Admin')

  async function onLogout() {
    await signOut()
    navigate('/admin/login')
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-black text-white">
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-4">
        <div className={`min-w-0 ${collapsed ? 'hidden lg:hidden' : ''}`}>
          <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
            CreaseTalk
          </p>
          <p className="truncate text-sm font-black tracking-tight uppercase italic">
            Admin
          </p>
        </div>
        {collapsed && (
          <p className="hidden text-xs font-black tracking-tight text-ct-orange uppercase lg:block">
            CT
          </p>
        )}
        <button
          type="button"
          className="ml-auto hidden rounded p-1.5 text-white/70 hover:bg-white/10 hover:text-white lg:inline-flex"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </button>
        <button
          type="button"
          className="ml-auto rounded p-1.5 text-white/70 hover:bg-white/10 lg:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          <X className="size-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const badge = badgeFor(counts, item.badgeKey)
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              title={item.label}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded px-3 py-2.5 text-xs font-bold tracking-wide uppercase transition-colors ${
                  isActive
                    ? 'bg-ct-orange text-black'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`
              }
            >
              <Icon className="size-4 shrink-0" strokeWidth={2} />
              <span className={`min-w-0 flex-1 truncate ${collapsed ? 'lg:hidden' : ''}`}>
                {item.label}
              </span>
              {badge != null && (
                <span
                  className={`rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-black ${
                    collapsed ? 'lg:absolute lg:top-1 lg:right-1 lg:px-1' : ''
                  }`}
                >
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-3 rounded px-3 py-2.5 text-xs font-bold tracking-wide text-white/80 uppercase hover:bg-white/10 hover:text-white ${
            collapsed ? 'lg:justify-center lg:px-2' : ''
          }`}
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className={collapsed ? 'lg:hidden' : ''}>View live site</span>
        </a>
      </div>
    </div>
  )

  return (
    <AdminToastProvider>
      <div className="min-h-screen bg-neutral-100 text-neutral-900">
        {mobileOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform lg:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          } ${collapsed ? 'lg:w-[72px]' : 'lg:w-64'}`}
        >
          {sidebar}
        </aside>

        <div
          className={`min-h-screen transition-[padding] ${
            collapsed ? 'lg:pl-[72px]' : 'lg:pl-64'
          }`}
        >
          <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/95 backdrop-blur">
            <div className="flex items-center gap-3 px-4 py-3 md:px-6">
              <button
                type="button"
                className="rounded border border-neutral-200 p-2 lg:hidden"
                aria-label="Open menu"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="size-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1 text-[11px] font-bold tracking-wide text-neutral-400 uppercase">
                  <span>Admin</span>
                  <ChevronRight className="size-3" />
                  <span className="truncate text-neutral-700">{crumb}</span>
                </div>
              </div>

              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="hidden items-center gap-1.5 rounded border border-neutral-200 px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase hover:border-black sm:inline-flex"
              >
                View live site
                <ExternalLink className="size-3.5" />
              </a>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-bold tracking-wide uppercase hover:border-black"
                >
                  <UserRound className="size-3.5" />
                  <span className="hidden max-w-[10rem] truncate sm:inline">
                    {email ?? 'Account'}
                  </span>
                </button>
                {accountOpen && (
                  <div className="absolute right-0 mt-2 w-52 border border-neutral-200 bg-white py-1 shadow-lg">
                    <NavLink
                      to="/admin/account"
                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase hover:bg-neutral-50"
                      onClick={() => setAccountOpen(false)}
                    >
                      <UserRound className="size-3.5" />
                      Account
                    </NavLink>
                    <button
                      type="button"
                      onClick={() => void onLogout()}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-red-700 uppercase hover:bg-red-50"
                    >
                      <LogOut className="size-3.5" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="px-4 py-6 md:px-6">
            <Outlet context={{ refreshNavCounts: refreshCounts }} />
          </main>
        </div>
      </div>
    </AdminToastProvider>
  )
}

/** Optional helper for pages that want a back affordance matching the shell. */
export function AdminBackLink({
  to,
  label,
}: {
  to: string
  label: string
}) {
  return (
    <NavLink
      to={to}
      className="inline-flex items-center gap-1 text-[10px] font-bold tracking-wide text-neutral-500 uppercase hover:text-black"
    >
      <ChevronLeft className="size-3.5" />
      {label}
    </NavLink>
  )
}
