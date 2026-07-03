import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { asset } from '@/lib/asset'

/**
 * Branded opening splash. Shows once per browser session on first load (a hard
 * refresh within the same session skips it, so logged-in users aren't nagged).
 * Dark, cinematic backdrop regardless of theme; respects reduced motion via the
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
    }, reduce ? 800 : 3000)
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
          exit={{ opacity: 0, scale: 1.08 }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
          aria-hidden
        >
          <div className="grid-bg pointer-events-none absolute inset-0 opacity-20" />

          {/* Radial brand glow — blooms, breathes, then settles */}
          <motion.div
            className="pointer-events-none absolute left-1/2 top-1/2 h-[52rem] w-[52rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(225,29,46,0.26), transparent 70%)' }}
            initial={{ scale: 0.35, opacity: 0 }}
            animate={{ scale: [0.35, 1.12, 0.98, 1.04], opacity: [0, 1, 0.8, 0.9] }}
            transition={{ duration: 2.6, ease: 'easeOut', times: [0, 0.45, 0.75, 1] }}
          />

          {/* Radar-style expanding rings behind the mark */}
          {[0.5, 1.3].map((delay, i) => (
            <motion.div
              key={i}
              className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-brand-500/30"
              initial={{ scale: 0.5, opacity: 0.7 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut', delay }}
            />
          ))}

          <div className="relative flex flex-col items-center">
            {/* Logo — de-blurs, overshoots, settles, then a light sweep passes twice */}
            <motion.div
              className="relative overflow-hidden"
              initial={{ opacity: 0, scale: 0.8, y: 12, filter: 'blur(12px)' }}
              animate={{
                opacity: 1,
                scale: [0.8, 1.06, 1],
                y: 0,
                filter: ['blur(12px)', 'blur(0px)', 'blur(0px)'],
              }}
              transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2, times: [0, 0.6, 1] }}
            >
              <img
                src={asset('logo-white.png')}
                alt="27 Markets"
                style={{ height: 76, width: 'auto' }}
                className="select-none"
              />
              <motion.span
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    'linear-gradient(105deg, transparent 34%, rgba(255,255,255,0.6) 50%, transparent 66%)',
                }}
                initial={{ x: '-130%' }}
                animate={{ x: '170%' }}
                transition={{
                  duration: 1.5,
                  ease: 'easeInOut',
                  delay: 0.9,
                  repeat: 1,
                  repeatDelay: 0.35,
                }}
              />
            </motion.div>

            {/* Progress underline */}
            <div className="mt-7 h-[3px] w-48 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.3, ease: 'easeInOut', delay: 0.4 }}
              />
            </div>

            <motion.p
              className="mt-4 text-[11px] font-medium uppercase text-white/50"
              initial={{ opacity: 0, letterSpacing: '0.14em' }}
              animate={{ opacity: 1, letterSpacing: '0.34em' }}
              transition={{ delay: 1, duration: 1.1, ease: 'easeOut' }}
            >
              Trade Beyond Limits
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
