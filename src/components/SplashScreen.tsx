import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/asset'

/**
 * Branded opening splash. Shows once per browser session on first load (a hard
 * refresh within the same session skips it). A light beam sweeps across and
 * "paints" the wordmark in. Dark backdrop regardless of theme; respects reduced
 * motion. Guarded so React StrictMode's dev remount can't replay it.
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
  const [reduce] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    if (!visible) return
    // Mark seen immediately so a StrictMode remount doesn't restart the animation.
    shownThisLoad = true
    sessionStorage.setItem(SESSION_KEY, '1')
    document.body.style.overflow = 'hidden'
    const t = window.setTimeout(() => setVisible(false), reduce ? 700 : 2300)
    return () => {
      window.clearTimeout(t)
      document.body.style.overflow = ''
    }
  }, [visible, reduce])

  const REVEAL = { duration: 1.3, ease: [0.65, 0, 0.35, 1] as const, delay: 0.35 }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden bg-[#07080c]"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.06 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden
        >
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

          {/* Soft brand glow */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(225,29,46,0.2), transparent 70%)' }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: reduce ? 0.6 : [0, 0.9, 0.72] }}
            transition={{ duration: 1.7, ease: 'easeOut' }}
          />

          <div className="relative flex flex-col items-center">
            <div className="relative">
              {reduce ? (
                <motion.img
                  src={asset('logo-white.png')}
                  alt="27 Markets"
                  style={{ height: 72, width: 'auto' }}
                  className="select-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              ) : (
                <>
                  {/* Wordmark painted in left → right by the beam */}
                  <motion.div
                    initial={{ clipPath: 'inset(0 100% 0 0)' }}
                    animate={{ clipPath: 'inset(0 0% 0 0)' }}
                    transition={REVEAL}
                  >
                    <img
                      src={asset('logo-white.png')}
                      alt="27 Markets"
                      style={{ height: 72, width: 'auto' }}
                      className="select-none"
                    />
                  </motion.div>

                  {/* Scanning light beam that leads the reveal */}
                  <motion.div
                    className="pointer-events-none absolute top-1/2 h-[155%] w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white"
                    style={{ boxShadow: '0 0 22px 7px rgba(225,29,46,0.8)' }}
                    initial={{ left: '0%', opacity: 0 }}
                    animate={{ left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
                    transition={{ ...REVEAL, times: [0, 0.12, 0.88, 1] }}
                  />
                </>
              )}
            </div>

            <motion.p
              className="mt-7 text-[11px] font-medium uppercase text-white/50"
              initial={{ opacity: 0, letterSpacing: '0.14em' }}
              animate={{ opacity: 1, letterSpacing: '0.34em' }}
              transition={{ delay: reduce ? 0.3 : 1.55, duration: 0.8, ease: 'easeOut' }}
            >
              Trade Beyond Limits
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
