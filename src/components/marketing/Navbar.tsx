import { AnimatePresence, motion } from 'framer-motion'
import { Menu, X, ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useBodyScrollLock } from '@/lib/hooks'
import { cn } from '@/lib/cn'

interface SubItem {
  label: string
  to: string
  desc: string
}
interface NavItem {
  label: string
  to: string
  menu: SubItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Trading',
    to: '/accounts',
    menu: [
      { label: 'Account Types', to: '/accounts', desc: 'Standard, Raw & Pro accounts' },
      { label: 'Trading Platforms', to: '/platforms', desc: 'Desktop, web & mobile' },
      { label: 'Markets', to: '/markets', desc: '100+ global instruments' },
      { label: 'Free Demo', to: '/demo', desc: 'Practice risk-free' },
    ],
  },
  {
    label: 'Platforms',
    to: '/platforms',
    menu: [
      { label: 'All Platforms', to: '/platforms', desc: 'Compare desktop, web & mobile' },
      { label: 'Try Free Demo', to: '/demo', desc: 'Test drive the platform' },
    ],
  },
  {
    label: 'Markets',
    to: '/markets',
    menu: [
      { label: 'Forex', to: '/markets?category=Forex', desc: 'Major, minor & exotic pairs' },
      { label: 'Metals', to: '/markets?category=Metals', desc: 'Gold, silver & more' },
      { label: 'Indices', to: '/markets?category=Indices', desc: 'Global index CFDs' },
      { label: 'Commodities', to: '/markets?category=Commodities', desc: 'Energy & agriculture' },
      { label: 'Stocks', to: '/markets?category=Stocks', desc: 'Global share CFDs' },
      { label: 'Crypto', to: '/markets?category=Crypto', desc: 'Top cryptocurrencies' },
    ],
  },
  {
    label: 'Partner with us',
    to: '/partnership',
    menu: [
      { label: 'IB Program', to: '/partnership', desc: 'Rebates, tools & support' },
      { label: 'Become a Partner', to: '/partner/apply', desc: 'Apply in minutes' },
      { label: 'Contact Us', to: '/contact', desc: 'Talk to our team' },
    ],
  },
  {
    label: 'Company',
    to: '/about',
    menu: [
      { label: 'About Us', to: '/about', desc: 'Our story & mission' },
      { label: 'Blog', to: '/blog', desc: 'News & insights' },
      { label: 'Partnership', to: '/partnership', desc: 'Grow with us' },
      { label: 'Contact', to: '/contact', desc: 'Get in touch' },
    ],
  },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const location = useLocation()
  useBodyScrollLock(open)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setOpen(false)
    setOpenMenu(null)
    setMobileExpanded(null)
  }, [location.pathname, location.search])

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-300',
        scrolled
          ? 'border-b border-white/[0.06] bg-ink-900/85 shadow-[0_10px_30px_-16px_rgba(0,0,0,0.55)] backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <nav
        className={cn(
          'container-bleed flex items-center justify-between gap-4 transition-all duration-300',
          scrolled ? 'h-14' : 'h-16'
        )}
      >
        <Link to="/" aria-label="27 Markets home">
          <Logo size={23} />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              <NavLink
                to={item.to}
                onFocus={() => setOpenMenu(item.label)}
                aria-expanded={openMenu === item.label}
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
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 opacity-50 transition-transform duration-200',
                        openMenu === item.label && 'rotate-180'
                      )}
                    />
                    <span
                      className={cn(
                        'absolute inset-x-3 -bottom-px h-px origin-left bg-brand-500 transition-transform duration-300',
                        isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                      )}
                    />
                  </>
                )}
              </NavLink>

              <AnimatePresence>
                {openMenu === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 top-full pt-3"
                  >
                    <div className="w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
                      {item.menu.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          className="block rounded-lg px-3 py-2 transition-colors hover:bg-white/[0.06]"
                        >
                          <div className="text-sm font-medium text-white">{sub.label}</div>
                          <div className="text-xs text-gray-400">{sub.desc}</div>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          ))}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
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
          type="button"
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
            <div className="container-bleed space-y-1 py-4">
              {navItems.map((item) => {
                const expanded = mobileExpanded === item.label
                return (
                  <div key={item.label}>
                    <div className="flex items-center">
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          cn(
                            'flex-1 rounded-lg px-4 py-3 text-base font-medium transition-colors',
                            isActive
                              ? 'bg-brand-500/10 text-white'
                              : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                          )
                        }
                      >
                        {item.label}
                      </NavLink>
                      <button
                        type="button"
                        onClick={() => setMobileExpanded(expanded ? null : item.label)}
                        aria-label={`Toggle ${item.label} menu`}
                        aria-expanded={expanded}
                        className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-400 hover:text-white"
                      >
                        <ChevronDown
                          className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')}
                        />
                      </button>
                    </div>
                    <AnimatePresence>
                      {expanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="space-y-0.5 py-1 pl-4">
                            {item.menu.map((sub) => (
                              <NavLink
                                key={sub.label}
                                to={sub.to}
                                className="block rounded-lg px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                              >
                                {sub.label}
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
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
