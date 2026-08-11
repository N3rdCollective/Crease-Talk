import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, ShoppingBag, X } from 'lucide-react'
import { Logo } from './Logo'
import { navLinks } from '../data/content'
import { useCart } from '../lib/cart'

export function Navbar() {
  const location = useLocation()
  const { count } = useCart()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('HOME')

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    const byPath = navLinks.find((link) => link.href === location.pathname)
    if (byPath) {
      setActive(byPath.label)
      return
    }
    if (location.hash) {
      const hashHref = `/${location.hash}`
      const match = navLinks.find(
        (link) => link.href === location.hash || link.href === hashHref,
      )
      if (match) setActive(match.label)
    } else if (location.pathname === '/') {
      setActive('HOME')
    }
  }, [location.pathname, location.hash])

  return (
    <header className="sticky top-0 z-50 bg-black text-white">
      <div className="mx-auto flex h-[88px] max-w-7xl items-center gap-6 px-4 md:h-[104px] md:px-8">
        <Link
          to="/"
          className="relative z-50 -ml-1 shrink-0 py-1 sm:-ml-2"
          onClick={() => {
            setActive('HOME')
            setOpen(false)
          }}
        >
          <Logo size="md" />
        </Link>

        <nav className="ml-auto hidden items-center gap-4 lg:flex xl:gap-6">
          {navLinks.map((link) => {
            const isActive = active === link.label
            return (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setActive(link.label)}
                className={`relative py-1 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors hover:text-ct-orange xl:text-xs ${
                  isActive ? 'text-white' : 'text-white/90'
                }`}
              >
                {link.label}
                {isActive && (
                  <span className="absolute right-0 -bottom-1 left-0 h-[2px] bg-ct-orange" />
                )}
              </Link>
            )
          })}
          <Link
            to="/shop/cart"
            aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
            className="relative p-1 text-white transition-colors hover:text-ct-orange"
          >
            <ShoppingBag className="size-5" strokeWidth={1.75} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center bg-ct-orange text-[9px] font-bold text-black">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Link>
        </nav>

        <Link
          to="/shop/cart"
          aria-label={count > 0 ? `Cart, ${count} items` : 'Cart'}
          className="relative z-50 ml-auto p-2 text-white lg:hidden"
          onClick={() => setOpen(false)}
        >
          <ShoppingBag className="size-5" strokeWidth={1.75} />
          {count > 0 && (
            <span className="absolute top-0.5 right-0.5 flex size-4 items-center justify-center bg-ct-orange text-[9px] font-bold text-black">
              {count > 9 ? '9+' : count}
            </span>
          )}
        </Link>

        <button
          type="button"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative z-50 p-2 text-white lg:hidden"
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" strokeWidth={2} />}
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-40 bg-black pt-28 lg:hidden">
          <nav className="flex flex-col gap-1 px-6">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => {
                  setActive(link.label)
                  setOpen(false)
                }}
                className={`border-b border-white/10 py-4 text-sm font-bold tracking-[0.14em] uppercase ${
                  active === link.label ? 'text-ct-orange' : 'text-white'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
