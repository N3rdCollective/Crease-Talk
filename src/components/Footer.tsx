import { Link } from 'react-router-dom'
import { ArrowRight, Mail } from 'lucide-react'
import { Logo } from './Logo'

type IconProps = { className?: string }

function InstagramIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className={className} aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function XIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.74l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
    </svg>
  )
}

function YoutubeIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" />
    </svg>
  )
}

function TikTokIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.27 6.27 0 0 0-.79-.05A6.34 6.34 0 0 0 3.15 15.2a6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.34-6.34V8.75a8.19 8.19 0 0 0 4.76 1.52V6.84a4.84 4.84 0 0 1-1-.15z" />
    </svg>
  )
}

const explore = [
  { label: 'Discover', href: '/#discover' },
  { label: 'Artists', href: '/#artists' },
  { label: 'Videos', href: '/videos' },
  { label: 'Music', href: '/#radio' },
  { label: 'Interviews', href: '/#interviews' },
  { label: 'Submit Music', href: '/#submit' },
]

const company = [
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
  { label: 'Careers', href: '#careers' },
  { label: 'Press', href: '#press' },
]

const social = [
  { label: 'Instagram', href: '#', icon: InstagramIcon },
  { label: 'X', href: '#', icon: XIcon },
  { label: 'YouTube', href: '#', icon: YoutubeIcon },
  { label: 'TikTok', href: '#', icon: TikTokIcon },
  { label: 'Email', href: 'mailto:hello@creasetalk.com', icon: Mail },
]

export function Footer() {
  return (
    <footer className="bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-xs text-xs font-semibold tracking-[0.12em] text-white/80 uppercase">
              THE CULTURE. THE CREATORS. THE FUTURE.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-[0.16em] uppercase">
              EXPLORE
            </h3>
            <ul className="mt-4 space-y-2.5">
              {explore.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-ct-orange"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-[0.16em] uppercase">
              COMPANY
            </h3>
            <ul className="mt-4 space-y-2.5">
              {company.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-ct-orange"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-extrabold tracking-[0.16em] uppercase">
              CONNECT & SUBSCRIBE
            </h3>
            <div className="mt-4 flex items-center gap-3">
              {social.map(({ label, href, icon: Icon }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="text-white/80 transition-colors hover:text-ct-orange"
                >
                  <Icon className="size-5" />
                </a>
              ))}
            </div>
            <form
              className="mt-5 flex border border-white"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="footer-email" className="sr-only">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                placeholder="Email address"
                className="min-w-0 flex-1 bg-black px-3 py-2.5 text-sm text-white placeholder:text-white/45 outline-none"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="bg-white px-3 text-black transition-opacity hover:opacity-90"
              >
                <ArrowRight className="size-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/20 pt-6 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2024 CreaseTalk LLC, All Rights Reserved.</p>
          <div className="flex gap-6">
            <a href="#privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </a>
            <a href="#terms" className="transition-colors hover:text-white">
              Terms of Use
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
