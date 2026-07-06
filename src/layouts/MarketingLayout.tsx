import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Navbar } from '@/components/marketing/Navbar'
import { Footer } from '@/components/marketing/Footer'
import { MobileCTABar } from '@/components/marketing/MobileCTABar'
import { SupportLauncher } from '@/components/marketing/SupportLauncher'

export function MarketingLayout() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    // When a link carries a #hash, scroll to that section (offset for the fixed
    // navbar); otherwise jump to the top on route change.
    if (hash) {
      const id = decodeURIComponent(hash.slice(1))
      const scroll = () => {
        const el = document.getElementById(id)
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY - 88
          window.scrollTo({ top, behavior: 'smooth' })
        }
      }
      // Defer a frame so the target route has rendered.
      requestAnimationFrame(scroll)
      return
    }
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [pathname, hash])

  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content" tabIndex={-1} className="flex-1 pt-16 outline-none">
        <Outlet />
      </main>
      <Footer />
      <SupportLauncher />
      <MobileCTABar />
    </div>
  )
}
