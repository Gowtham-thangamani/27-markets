import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Menu } from 'lucide-react'
import { Outlet, useLocation } from 'react-router-dom'
import { AdminSidebarContent } from '@/components/admin/AdminSidebar'
import { ThemeToggle } from '@/components/ThemeToggle'
import { useAuth } from '@/context/AuthContext'
import { useBodyScrollLock } from '@/lib/hooks'
import { initials } from '@/lib/format'

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { pathname } = useLocation()
  const { user } = useAuth()
  useBodyScrollLock(mobileOpen)

  useEffect(() => {
    setMobileOpen(false)
    document.querySelector('#admin-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex h-dvh-safe overflow-hidden bg-ink-900">
      <a href="#admin-scroll" className="skip-link">
        Skip to content
      </a>
      <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-850 lg:block">
        <AdminSidebarContent />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-64 border-r border-white/[0.06] bg-ink-850 lg:hidden"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            >
              <AdminSidebarContent onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-white/[0.06] bg-ink-900/85 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-300 hover:bg-white/[0.06] hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="hidden sm:block">
            <p className="text-xs text-gray-500">CRM Back-Office</p>
            <p className="text-sm font-semibold text-white">{user?.name ?? 'Staff'}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500/15 text-sm font-semibold text-brand-300 ring-1 ring-brand-500/30">
              {initials(user?.name ?? 'Staff')}
            </span>
          </div>
        </header>
        <main id="admin-scroll" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
          <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
