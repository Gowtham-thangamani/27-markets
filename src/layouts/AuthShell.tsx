import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, ShieldCheck } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { MarketWave } from '@/components/three/MarketWave'

interface AuthShellProps {
  children: ReactNode
  /** Right-side marketing panel content. */
  aside?: ReactNode
}

/** Split-screen shell for login / register / demo with ambient red atmosphere. */
export function AuthShell({ children, aside }: AuthShellProps) {
  return (
    <div className="grid min-h-dvh-safe lg:grid-cols-2">
      {/* Left: ambient brand panel with portal dashboard preview */}
      <div className="relative hidden overflow-hidden bg-ink-850 lg:block">
        <div className="grid-bg absolute inset-0 opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900/30 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -left-20 top-1/3 h-80 w-80 bg-radial-red opacity-70 blur-2xl" />

        {/* Animated market wave */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-48 opacity-80">
          <MarketWave />
        </div>

        <div className="relative flex h-full flex-col justify-between p-12">
          <Link to="/">
            <Logo />
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {aside ?? (
              <>
                <p className="section-eyebrow mb-3">Client Portal</p>
                <h2 className="font-display text-4xl font-bold leading-tight text-white">
                  Globally trusted &amp; <span className="text-gradient-red">multi-regulated</span> broker
                </h2>
                <p className="mt-4 max-w-sm text-gray-400">
                  Access global markets with institutional-grade liquidity, sub-30ms execution, and
                  spreads from 0.0 pips.
                </p>
                <p className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-gray-300">
                  <ShieldCheck className="h-4 w-4 text-brand-400" /> Segregated funds · Bank-grade security
                </p>
              </>
            )}
          </motion.div>
          <p className="text-xs text-gray-600">© 2026 27 Markets · Demonstration product</p>
        </div>
      </div>

      {/* Right: form area */}
      <div className="relative flex flex-col">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-20 lg:hidden" />
        <div className="relative flex items-center justify-between p-6">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <Link
            to="/"
            className="ml-auto inline-flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>
        </div>
        <div className="relative flex flex-1 items-center justify-center p-6 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  )
}
