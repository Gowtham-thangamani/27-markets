import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useReducedMotion } from 'framer-motion'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SignalFlow } from '@/components/marketing/SignalFlow'
import { useT } from '@/i18n/LanguageContext'

// three.js is ~144 KB — keep it off the landing critical path. Load the decorative
// wave only when the CTA scrolls near view, and never under reduced motion.
const MarketWave = lazy(() =>
  import('@/components/three/MarketWave').then((m) => ({ default: m.MarketWave })),
)

export function CTABand() {
  const t = useT()
  const reduce = useReducedMotion()
  const waveRef = useRef<HTMLDivElement>(null)
  const [showWave, setShowWave] = useState(false)

  useEffect(() => {
    if (reduce) return
    const el = waveRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShowWave(true)
          io.disconnect()
        }
      },
      { rootMargin: '250px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduce])

  return (
    <section className="container-x py-20">
      <Reveal>
        <div className="glass-panel relative overflow-hidden px-6 py-14 text-center sm:px-12">
          <div ref={waveRef} className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-40">
            {showWave && (
              <Suspense fallback={null}>
                <MarketWave />
              </Suspense>
            )}
          </div>
          <div className="pointer-events-none absolute inset-0 bg-radial-red opacity-60" />
          <SignalFlow className="opacity-40" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              {t('cta.title')}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-300">{t('cta.desc')}</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  className="shadow-[0_0_34px_-4px_rgba(225,29,46,0.55)] transition-shadow hover:shadow-[0_0_48px_-2px_rgba(225,29,46,0.7)]"
                >
                  {t('cta.primary')}
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  {t('cta.secondary')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
