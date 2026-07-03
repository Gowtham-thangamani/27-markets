import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/asset'

/**
 * Branded opening splash — a clean fade-in of the logo on a dark backdrop, then
 * a graceful fade-out. Shows once per browser session on first load (a hard
 * refresh within the same session skips it). Respects reduced motion, and is
 * guarded so React StrictMode's dev remount can't replay it.
 */
const SESSION_KEY = '27m-splash-shown'
let shownThisLoad = false

export function SplashScreen() {
  const [visible, setVisible] = useState(
    () =>
      typeof window !== 'undefined' &&
      !shownThisLoad &&
      sessionStorage.getItem(SESSION_KEY) !== '1',
  )

  useEffect(() => {
    if (!visible) return
    // Mark seen immediately so a StrictMode remount doesn't restart the animation.
    shownThisLoad = true
    sessionStorage.setItem(SESSION_KEY, '1')
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => setVisible(false), reduce ? 700 : 1900)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [visible])

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#07080c]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden
        >
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

          {/* Soft brand glow fades in behind the mark */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[38rem] w-[38rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(225,29,46,0.18), transparent 70%)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.75 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />

          <div className="relative flex flex-col items-center">
            {/* Logo — a gentle fade + rise */}
            <motion.img
              src={asset('logo-white.png')}
              alt="27 Markets"
              style={{ height: 72, width: 'auto' }}
              className="select-none"
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.9, ease: [0.22, 0.61, 0.36, 1], delay: 0.15 }}
            />

            <motion.p
              className="mt-6 text-[11px] font-medium uppercase tracking-[0.32em] text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.7, ease: 'easeOut' }}
            >
              Trade Beyond Limits
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
