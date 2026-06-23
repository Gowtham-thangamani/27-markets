import { AnimatePresence, motion } from 'framer-motion'
import { Globe, Menu, X, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'
import { useBodyScrollLock } from '@/lib/hooks'
import { cn } from '@/lib/cn'

const navItems = [
  { label: 'Trading', to: '/accounts' },
  { label: 'Platforms', to: '/platforms' },
  { label: 'Markets', to: '/markets' },
  { label: 'Partnership', to: '/partnership' },
  { label: 'Company', to: '/about' },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useBodyScrollLock(open)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [location.pathname])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-white/[0.06] bg-ink-900/85 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <nav className="container-x flex h-16 items-center justify-between gap-4">
        <Link to="/" aria-label="27 Markets home">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li key={item.label}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'group relative flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                    isActive ? 'text-white' : 'text-gray-300 hover:text-white'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <ChevronDown className="h-3.5 w-3.5 opacity-50 transition-transform group-hover:translate-y-0.5" />
                    <span
                      className={cn(
                        'absolute inset-x-3 -bottom-px h-px origin-left bg-brand-500 transition-transform duration-300',
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      )}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <button
            aria-label="Language"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-300 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <Globe className="h-[18px] w-[18px]" />
          </button>
          <Link to="/login">
            <Button variant="ghost" size="sm">
              Login
            </Button>
          </Link>
          <Link to="/register">
            <Button size="sm">Open Account</Button>
          </Link>
        </div>

        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-white lg:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-white/[0.06] bg-ink-900/95 backdrop-blur-xl lg:hidden"
          >
            <div className="container-x space-y-1 py-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className={({ isActive }) =>
                    cn(
                      'block rounded-lg px-4 py-3 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-brand-500/10 text-white'
                        : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
              <div className="flex gap-3 pt-3">
                <Link to="/login" className="flex-1">
                  <Button variant="outline" fullWidth>
                    Login
                  </Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button fullWidth>Open Account</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
