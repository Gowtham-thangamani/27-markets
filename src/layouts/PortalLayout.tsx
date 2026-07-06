import { AnimatePresence, motion } from 'framer-motion'
import { createContext, useContext, useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { SidebarContent } from '@/components/portal/Sidebar'
import { Topbar } from '@/components/portal/Topbar'
import { OpenAccountModal } from '@/components/portal/OpenAccountModal'
import { VerifyEmailBanner } from '@/components/portal/VerifyEmailBanner'
import { useBodyScrollLock } from '@/lib/hooks'

interface PortalUIContextValue {
  openNewAccount: () => void
}
const PortalUIContext = createContext<PortalUIContextValue | null>(null)
export const usePortalUI = () => {
  const ctx = useContext(PortalUIContext)
  if (!ctx) throw new Error('usePortalUI must be used within PortalLayout')
  return ctx
}

export function PortalLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [accountModal, setAccountModal] = useState(false)
  const { pathname } = useLocation()
  useBodyScrollLock(mobileOpen)

  useEffect(() => {
    setMobileOpen(false)
    document.querySelector('#portal-scroll')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <PortalUIContext.Provider value={{ openNewAccount: () => setAccountModal(true) }}>
      <div className="flex h-dvh-safe overflow-hidden bg-ink-900">
        <a href="#portal-scroll" className="skip-link">
          Skip to content
        </a>
        {/* Desktop sidebar */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-ink-850 lg:block">
          <SidebarContent />
        </aside>

        {/* Mobile drawer */}
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
                <SidebarContent onNavigate={() => setMobileOpen(false)} />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main */}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            onOpenSidebar={() => setMobileOpen(true)}
            onOpenAccount={() => setAccountModal(true)}
          />
          <main id="portal-scroll" tabIndex={-1} className="flex-1 overflow-y-auto outline-none">
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6 lg:p-8">
              <VerifyEmailBanner />
              <Outlet />
              <p className="mt-10 border-t border-white/[0.06] pt-5 text-[11px] leading-relaxed text-gray-500">
                <span className="font-semibold text-gray-400">Risk warning:</span> Trading leveraged
                products such as CFDs carries a high risk of losing money rapidly due to leverage and
                may not be suitable for all investors. 27 Markets is finalising its regulatory
                authorization and currently operates as a demonstration product. Nothing here is
                investment advice.
              </p>
            </div>
          </main>
        </div>
      </div>

      <OpenAccountModal open={accountModal} onClose={() => setAccountModal(false)} />
    </PortalUIContext.Provider>
  )
}
