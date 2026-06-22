import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import type { MouseEvent } from 'react'
import { MiniChart } from './MiniChart'
import { MarketWave } from '@/components/three/MarketWave'
import { LazyParticleField } from '@/components/three/Lazy3D'
import { useReducedMotion } from '@/lib/hooks'

const watchlist = [
  { sym: 'EUR/USD', px: '1.0842', chg: '+0.18%', up: true },
  { sym: 'XAU/USD', px: '2348.6', chg: '+0.86%', up: true },
  { sym: 'BTC/USD', px: '64,280', chg: '+1.86%', up: true },
  { sym: 'US100', px: '19,842', chg: '-0.22%', up: false },
]

export function HeroVisual() {
  const reduced = useReducedMotion()
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 })
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 18 })

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    if (reduced) return
    const rect = e.currentTarget.getBoundingClientRect()
    mx.set((e.clientX - rect.left) / rect.width - 0.5)
    my.set((e.clientY - rect.top) / rect.height - 0.5)
  }

  const reset = () => {
    mx.set(0)
    my.set(0)
  }

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-xl select-none"
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {/* Ambient glow + particles behind devices */}
      <div className="absolute inset-0 -z-10 rounded-full bg-radial-red blur-2xl" />
      <LazyParticleField className="absolute inset-0 -z-10" />

      {/* Glowing market wave sweeping under the devices */}
      <div className="absolute inset-x-0 bottom-10 -z-0 h-40 opacity-90">
        <MarketWave />
      </div>

      <motion.div
        className="absolute inset-0 flex items-center justify-center [transform-style:preserve-3d]"
        style={reduced ? undefined : { rotateX, rotateY }}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Laptop */}
        <motion.div
          className="relative w-[78%] [transform:translateZ(40px)]"
          animate={reduced ? undefined : { y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="rounded-t-xl border border-white/10 bg-ink-600 p-2 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
            <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-ink-850">
              {/* Screen top bar */}
              <div className="flex items-center justify-between border-b border-white/[0.05] px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-white">EUR/USD</span>
                  <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-medium text-success">
                    +0.18%
                  </span>
                </div>
                <div className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                  <span className="h-1.5 w-1.5 rounded-full bg-white/20" />
                </div>
              </div>
              {/* Chart area */}
              <div className="flex">
                <div className="h-28 flex-1 px-2 py-2">
                  <MiniChart />
                </div>
                <div className="w-20 border-l border-white/[0.05] p-2">
                  {watchlist.slice(0, 3).map((w) => (
                    <div key={w.sym} className="mb-1.5">
                      <div className="text-[8px] text-gray-400">{w.sym}</div>
                      <div className="text-[9px] font-semibold text-white">{w.px}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          {/* Laptop base */}
          <div className="mx-auto h-2 w-[108%] -translate-x-[3.7%] rounded-b-xl bg-gradient-to-b from-ink-500 to-ink-700 shadow-lg" />
          <div className="mx-auto h-1 w-[40%] rounded-b-lg bg-ink-400" />
        </motion.div>

        {/* Floating phone */}
        <motion.div
          className="absolute -bottom-2 right-2 w-[26%] [transform:translateZ(90px)]"
          initial={{ opacity: 0, x: 30 }}
          animate={
            reduced
              ? { opacity: 1, x: 0 }
              : { opacity: 1, x: 0, y: [0, -14, 0] }
          }
          transition={{
            opacity: { duration: 0.8, delay: 0.3 },
            x: { duration: 0.8, delay: 0.3 },
            y: { duration: 5, repeat: Infinity, ease: 'easeInOut' },
          }}
        >
          <div className="rounded-[20px] border border-white/15 bg-ink-700 p-1.5 shadow-[0_24px_50px_-12px_rgba(0,0,0,0.8)] red-glow">
            <div className="overflow-hidden rounded-[14px] bg-ink-850">
              <div className="mx-auto mt-1 h-1 w-8 rounded-full bg-white/15" />
              <div className="p-2">
                <div className="text-[8px] text-gray-400">Portfolio</div>
                <div className="text-xs font-bold text-white">$25,430.50</div>
                <div className="mt-1 flex items-center gap-1 text-[8px] font-medium text-success">
                  <TrendingUp className="h-2.5 w-2.5" /> +2.4% today
                </div>
                <div className="mt-2 h-14">
                  <MiniChart />
                </div>
                <div className="mt-2 space-y-1">
                  {watchlist.slice(2).map((w) => (
                    <div key={w.sym} className="flex items-center justify-between">
                      <span className="text-[8px] text-gray-300">{w.sym}</span>
                      <span
                        className={`flex items-center gap-0.5 text-[8px] font-medium ${
                          w.up ? 'text-success' : 'text-brand-400'
                        }`}
                      >
                        {w.up ? (
                          <TrendingUp className="h-2 w-2" />
                        ) : (
                          <TrendingDown className="h-2 w-2" />
                        )}
                        {w.chg}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
