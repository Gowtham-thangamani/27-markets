import { AnimatePresence, motion } from 'framer-motion'
import {
  Menu,
  X,
  ChevronDown,
  Layers,
  MonitorSmartphone,
  Globe,
  PlayCircle,
  LayoutGrid,
  DollarSign,
  Gem,
  BarChart3,
  Boxes,
  CandlestickChart,
  Bitcoin,
  Handshake,
  UserPlus,
  Mail,
  Building2,
  Newspaper,
  ShieldCheck,
  Wallet,
  HelpCircle,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useT } from '@/i18n/LanguageContext'
import { useBodyScrollLock } from '@/lib/hooks'
import { track } from '@/lib/analytics'
import { cn } from '@/lib/cn'

interface SubItem {
  label: string
  labelKey: string
  to: string
  desc: string
  icon: LucideIcon
}
interface NavItem {
  label: string
  labelKey: string
  to: string
  menu: SubItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Trading',
    labelKey: 'nav.trading',
    to: '/accounts',
    menu: [
      { label: 'Account Types', labelKey: 'nav.accountTypes', to: '/accounts', desc: 'Standard, Raw & VIP accounts', icon: Layers },
      { label: 'Trading Conditions', labelKey: 'nav.conditions', to: '/conditions', desc: 'Spreads, commission & leverage', icon: BarChart3 },
      { label: 'Funding', labelKey: 'nav.funding', to: '/funding', desc: 'Deposits from $50, no-min withdrawal', icon: Wallet },
      { label: 'Free Demo', labelKey: 'nav.demo', to: '/demo', desc: 'Practice risk-free', icon: PlayCircle },
    ],
  },
  {
    label: 'Platforms',
    labelKey: 'nav.platforms',
    to: '/platforms',
    menu: [
      { label: 'All Platforms', labelKey: 'nav.allPlatforms', to: '/platforms', desc: 'Web trader & desktop', icon: LayoutGrid },
      { label: 'Web Trader', labelKey: 'nav.webTrader', to: '/platforms#web', desc: 'Trade in your browser', icon: Globe },
      { label: 'Desktop', labelKey: 'nav.desktop', to: '/platforms#desktop', desc: 'MetaTrader 5 desktop', icon: MonitorSmartphone },
    ],
  },
  {
    label: 'Markets',
    labelKey: 'nav.markets',
    to: '/markets',
    menu: [
      { label: 'Forex', labelKey: 'nav.forex', to: '/markets?category=Forex', desc: 'Major, minor & exotic pairs', icon: DollarSign },
      { label: 'Metals', labelKey: 'nav.metals', to: '/markets?category=Metals', desc: 'Gold, silver & more', icon: Gem },
      { label: 'Indices', labelKey: 'nav.indices', to: '/markets?category=Indices', desc: 'Global index CFDs', icon: BarChart3 },
      { label: 'Commodities', labelKey: 'nav.commodities', to: '/markets?category=Commodities', desc: 'Energy & agriculture', icon: Boxes },
      { label: 'Stocks', labelKey: 'nav.stocks', to: '/markets?category=Stocks', desc: 'Global share CFDs', icon: CandlestickChart },
      { label: 'Crypto', labelKey: 'nav.crypto', to: '/markets?category=Crypto', desc: 'Top cryptocurrencies', icon: Bitcoin },
      { label: 'Economic Calendar', labelKey: 'nav.calendar', to: '/economic-calendar', desc: 'Key events & data releases', icon: CalendarClock },
    ],
  },
  {
    label: 'Partner with us',
    labelKey: 'nav.partner',
    to: '/partnership',
    menu: [
      { label: 'IB Program', labelKey: 'nav.ibProgram', to: '/partnership', desc: 'Rebates, tools & support', icon: Handshake },
      { label: 'Become a Partner', labelKey: 'nav.becomePartner', to: '/partner/apply', desc: 'Apply in minutes', icon: UserPlus },
    ],
  },
  {
    label: 'Company',
    labelKey: 'nav.company',
    to: '/about',
    menu: [
      { label: 'About Us', labelKey: 'nav.about', to: '/about', desc: 'Our story & mission', icon: Building2 },
      { label: 'Trust & Safety', labelKey: 'nav.trust', to: '/trust', desc: 'How we protect you', icon: ShieldCheck },
      { label: 'Market News', labelKey: 'nav.marketNews', to: '/blog', desc: 'Insights & analysis', icon: Newspaper },
      { label: 'Help & FAQ', labelKey: 'nav.help', to: '/faq', desc: 'Answers & support', icon: HelpCircle },
      { label: 'Contact', labelKey: 'nav.contact', to: '/contact', desc: 'Get in touch', icon: Mail },
    ],
  },
]

const basePath = (to: string) => to.split('#')[0].split('?')[0]

/** A section is "active" when the current route matches its hub or any of its
 * dropdown destinations — used to highlight the (non-navigating) top-level label. */
function isSectionActive(item: NavItem, pathname: string): boolean {
  if (basePath(item.to) === pathname) return true
  return item.menu.some((s) => {
    const b = basePath(s.to)
    return b !== '/' && b === pathname
  })
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null)
  const location = useLocation()
  const t = useT()
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
          <Logo size={40} />
        </Link>

        <ul className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const active = isSectionActive(item, location.pathname)
            return (
            <li
              key={item.label}
              className="relative"
              onMouseEnter={() => setOpenMenu(item.label)}
              onMouseLeave={() => setOpenMenu(null)}
            >
              {/* Top-level label opens its menu (no navigation) — every clickable
                  destination lives once, inside the dropdown. */}
              <button
                type="button"
                onClick={() => setOpenMenu((m) => (m === item.label ? null : item.label))}
                onFocus={() => setOpenMenu(item.label)}
                aria-expanded={openMenu === item.label}
                aria-haspopup="true"
                className={cn(
                  'group relative flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
                  active ? 'text-white' : 'text-gray-300 hover:text-white'
                )}
              >
                {t(item.labelKey)}
                <ChevronDown
                  className={cn(
                    'h-3.5 w-3.5 opacity-50 transition-transform duration-200',
                    openMenu === item.label && 'rotate-180'
                  )}
                />
                <span
                  className={cn(
                    'absolute inset-x-3 -bottom-px h-px origin-left bg-brand-500 transition-transform duration-300',
                    active ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
                  )}
                />
              </button>

              <AnimatePresence>
                {openMenu === item.label && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.16 }}
                    className="absolute left-0 top-full pt-3"
                  >
                    <div className="w-80 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                      {item.menu.map((sub) => (
                        <Link
                          key={sub.label}
                          to={sub.to}
                          className="group/sub flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.06]"
                        >
                          <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15 transition-colors group-hover/sub:bg-brand-500 group-hover/sub:text-white">
                            <sub.icon className="h-[18px] w-[18px]" />
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-white">{t(sub.labelKey)}</span>
                            <span className="block text-xs leading-snug text-gray-400">{sub.desc}</span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
            )
          })}
        </ul>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSwitcher />
          <Link to="/login">
            <Button variant="ghost" size="sm">
              {t('nav.login')}
            </Button>
          </Link>
          <Link to="/register" onClick={() => track('open_account_click', { location: 'navbar' })}>
            <Button size="sm">{t('nav.openAccount')}</Button>
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
                      <button
                        type="button"
                        onClick={() => setMobileExpanded(expanded ? null : item.label)}
                        aria-expanded={expanded}
                        className={cn(
                          'flex flex-1 items-center justify-between rounded-lg px-4 py-3 text-base font-medium transition-colors',
                          isSectionActive(item, location.pathname)
                            ? 'bg-brand-500/10 text-white'
                            : 'text-gray-300 hover:bg-white/[0.04] hover:text-white'
                        )}
                      >
                        {t(item.labelKey)}
                        <ChevronDown
                          className={cn('h-4 w-4 text-gray-400 transition-transform', expanded && 'rotate-180')}
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
                                className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-gray-300 transition-colors hover:bg-white/[0.04] hover:text-white"
                              >
                                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-400">
                                  <sub.icon className="h-4 w-4" />
                                </span>
                                {t(sub.labelKey)}
                              </NavLink>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
              <div className="flex items-center gap-3 pt-3">
                <LanguageSwitcher className="border border-white/10" />
                <Link to="/login" className="flex-1">
                  <Button variant="outline" fullWidth>
                    {t('nav.login')}
                  </Button>
                </Link>
                <Link to="/register" className="flex-1">
                  <Button fullWidth>{t('nav.openAccount')}</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
