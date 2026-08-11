import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { signOut } from '../lib/auth'

const links = [
  { to: '/admin', label: 'Video Queue', end: true },
  { to: '/admin/artists', label: 'Artists' },
  { to: '/admin/submissions', label: 'Submissions' },
  { to: '/admin/staff', label: 'Staff' },
  { to: '/admin/account', label: 'Account' },
]

export function AdminLayout() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="border-b border-neutral-200 bg-black text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 md:px-6">
          <div>
            <p className="text-[10px] font-bold tracking-[0.2em] text-ct-orange uppercase">
              CreaseTalk
            </p>
            <h1 className="text-lg font-black tracking-tight uppercase italic">
              Admin
            </h1>
          </div>
          <nav className="flex flex-1 flex-wrap gap-1 md:justify-center">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `rounded px-3 py-1.5 text-xs font-bold tracking-wide uppercase ${
                    isActive
                      ? 'bg-white text-black'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white"
            >
              View site
            </a>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => navigate('/admin/login'))
              }}
              className="rounded bg-white/10 px-3 py-1.5 text-xs font-bold uppercase hover:bg-white/20"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        <Outlet />
      </main>
    </div>
  )
}
