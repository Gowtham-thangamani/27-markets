import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/asset'

/**
 * Branded opening splash. Shows once per browser session on first load (a hard
 * refresh within the same session skips it, so logged-in users aren't nagged).
 * Dark premium backdrop regardless of theme; respects reduced motion via the
 * global MotionConfig + a shortened hold.
 */
const SESSION_KEY = '27m-splash-shown'

export function SplashScreen() {
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(SESSION_KEY) !== '1',
  )

  useEffect(() => {
    if (!visible) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(false)
    }, reduce ? 700 : 2100)
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
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden
        >
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

          {/* Radial brand glow that blooms behind the mark */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(225,29,46,0.22), transparent 70%)' }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 1.05, 1], opacity: [0, 1, 0.85] }}
            transition={{ duration: 1.6, ease: 'easeOut' }}
          />

          <div className="relative flex flex-col items-center">
            {/* Logo with a light-sweep shimmer */}
            <motion.div
              className="relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 130, damping: 14, delay: 0.1 }}
            >
              <img
                src={asset('logo-white.png')}
                alt="27 Markets"
                style={{ height: 64, width: 'auto' }}
                className="select-none"
              />
              <motion.span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)',
                }}
                initial={{ x: '-120%' }}
                animate={{ x: '160%' }}
                transition={{ duration: 1.1, ease: 'easeInOut', delay: 0.55 }}
              />
            </motion.div>

            {/* Progress underline */}
            <div className="mt-6 h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.5, ease: 'easeInOut', delay: 0.3 }}
              />
            </div>

            <motion.p
              className="mt-4 text-[11px] font-medium uppercase tracking-[0.32em] text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Trade Beyond Limits
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
