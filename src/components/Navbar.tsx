import { useEffect, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from './Logo'
import { navLinks } from '../data/content'

export function Navbar() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('HOME')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <header className="sticky top-0 z-50 bg-black text-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 md:h-[72px] md:px-8">
        <a href="#home" className="relative z-50 shrink-0" onClick={() => setOpen(false)}>
          <Logo size="md" />
        </a>

        <nav className="ml-auto hidden items-center gap-4 lg:flex xl:gap-6">
          {navLinks.map((link) => {
            const isActive = active === link.label
            return (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setActive(link.label)}
                className={`relative py-1 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:text-ct-orange xl:text-xs ${
                  isActive ? 'text-white' : 'text-white/90'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute right-0 -bottom-1 left-0 h-[2px] bg-ct-orange" />
                )}
              </a>
            )
          })}
        </nav>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative z-50 ml-auto p-2 text-white lg:ml-0"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" strokeWidth={2} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black pt-20 lg:hidden">
          <nav className="flex flex-col gap-1 px-6">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => {
                  setActive(link.label)
                  setOpen(false)
                }}
                className={`border-b border-white/10 py-4 text-sm font-bold tracking-[0.14em] uppercase ${
                  active === link.label ? 'text-ct-orange' : 'text-white'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
