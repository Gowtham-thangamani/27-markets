import { useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, ChevronLeft, ChevronRight, ShieldCheck, Zap, Gauge } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { asset } from '@/lib/asset'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { HeroFloatingCards } from '@/components/marketing/HeroFloatingCards'
import { useT } from '@/i18n/LanguageContext'

interface Quote {
  symbol: string
  price: number
  changePct?: number
}

interface HeroSliderProps {
  onLight: boolean
  quotes: Quote[]
  /** Render a single focused frame (no auto-advance, no carousel controls).
   * Flip to false to restore the rotating 3-slide hero. */
  single?: boolean
}

type Visual = 'platform' | 'globe' | 'coins'

interface Slide {
  id: string
  pill: string
  pillKey?: string
  lines: [string, string, string]
  lineKeys?: [string, string, string]
  tagline: string
  taglineKey?: string
  description: string
  descKey?: string
  primary: { label: string; to: string; labelKey?: string }
  secondary: { label: string; to: string; labelKey?: string }
  visual: Visual
}

const SLIDES: Slide[] = [
  {
    id: 'trade',
    pill: 'Next-generation multi-asset broker',
    pillKey: 'hero.pill',
    lines: ['Trade', 'Beyond', 'Limits'],
    lineKeys: ['hero.line1', 'hero.line2', 'hero.line3'],
    tagline: 'Precision · Performance · Partnership',
    taglineKey: 'hero.tagline',
    description:
      'Access global financial markets through a broker built for traders, partners, and long-term growth.',
    descKey: 'hero.desc',
    primary: { label: 'Open Live Account', to: '/register', labelKey: 'hero.ctaPrimary' },
    secondary: { label: 'Try Free Demo', to: '/demo', labelKey: 'hero.ctaSecondary' },
    visual: 'platform',
  },
  {
    id: 'partner',
    pill: 'Introducing Broker program',
    lines: ['Partner', '&', 'Prosper'],
    tagline: 'Rebates · Tools · Dedicated Support',
    description:
      'Earn competitive rebates with powerful partner tools and dedicated support to grow your business across global markets.',
    primary: { label: 'Become a Partner', to: '/partnership' },
    secondary: { label: 'Learn More', to: '/partnership' },
    visual: 'globe',
  },
  {
    id: 'growth',
    pill: 'Low-cost trading',
    lines: ['Keep', 'More', 'Per Trade'],
    tagline: 'Tight Spreads · Fast Execution',
    description:
      'Spreads from 0.0 pips and sub-30ms execution mean more of every winning trade stays in your account.',
    primary: { label: 'Explore Accounts', to: '/accounts' },
    secondary: { label: 'Open Account', to: '/register' },
    visual: 'coins',
  },
]

const TRUST = [
  { icon: ShieldCheck, label: 'Segregated funds', key: 'hero.trust1' },
  { icon: Zap, label: 'No dealing desk', key: 'hero.trust2' },
  { icon: Gauge, label: '2-minute setup', key: 'hero.trust3' },
]

const AUTO_MS = 6000

export function HeroSlider({ onLight, quotes, single = false }: HeroSliderProps) {
  const reduce = useReducedMotion()
  const t = useT()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const slide = SLIDES[index]

  const go = (n: number) => setIndex((i) => (n + SLIDES.length) % SLIDES.length)

  // Auto-advance — disabled in single mode, under reduced motion, or while hovered/focused.
  useEffect(() => {
    if (single || reduce || paused) return
    const t = setTimeout(() => setIndex((i) => (i + 1) % SLIDES.length), AUTO_MS)
    return () => clearTimeout(t)
  }, [index, paused, reduce, single])

  return (
    <div
      className="relative"
      role="region"
      aria-roledescription={single ? undefined : 'carousel'}
      aria-label="Featured highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onKeyDown={(e) => {
        if (single) return
        if (e.key === 'ArrowLeft') go(index - 1)
        else if (e.key === 'ArrowRight') go(index + 1)
      }}
    >
      <div className="container-bleed relative grid items-center gap-8 py-3 sm:grid-cols-[1fr_1.1fr] sm:gap-10 sm:py-5">
        {/* Text column */}
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            className="relative z-10"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${SLIDES.length}`}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1 text-xs font-medium text-white"
            >
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-brand-500" />
              {slide.pillKey ? t(slide.pillKey) : slide.pill}
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              {slide.lineKeys ? t(slide.lineKeys[0]) : slide.lines[0]}
              <br />
              {slide.lineKeys ? t(slide.lineKeys[1]) : slide.lines[1]}
              <br />
              <span className="relative inline-block">
                <span
                  className={
                    onLight
                      ? 'bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent'
                      : 'text-white'
                  }
                >
                  {slide.lineKeys ? t(slide.lineKeys[2]) : slide.lines[2]}
                </span>
                <span className="hero-underline absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand-500 to-transparent" />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-sm font-medium tracking-wide text-white/80">
              {slide.taglineKey ? t(slide.taglineKey) : slide.tagline}
            </motion.p>
            <motion.p variants={fadeUp} className="mt-3 max-w-md text-base leading-relaxed text-gray-300">
              {slide.descKey ? t(slide.descKey) : slide.description}
            </motion.p>

            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
              <Link to={slide.primary.to}>
                <Button
                  size="lg"
                  className="gap-2 shadow-[0_0_34px_-4px_rgba(225,29,46,0.55)] transition-shadow hover:shadow-[0_0_48px_-2px_rgba(225,29,46,0.7)]"
                >
                  {slide.primary.labelKey ? t(slide.primary.labelKey) : slide.primary.label}{' '}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to={slide.secondary.to}>
                <Button variant="outline" size="lg">
                  {slide.secondary.labelKey ? t(slide.secondary.labelKey) : slide.secondary.label}
                </Button>
              </Link>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-400"
            >
              {TRUST.map((item) => (
                <span key={item.key} className="inline-flex items-center gap-1.5">
                  <item.icon className="h-3.5 w-3.5 text-brand-500" aria-hidden /> {t(item.key)}
                </span>
              ))}
            </motion.p>
          </motion.div>
        </AnimatePresence>

        {/* Visual column */}
        <div className="relative">
          <div
            aria-hidden
            className="hero-rings pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{
              background: onLight
                ? 'radial-gradient(closest-side, rgba(225,29,46,0.20), rgba(225,29,46,0.06) 55%, transparent 76%)'
                : 'radial-gradient(closest-side, rgba(225,29,46,0.52), rgba(225,29,46,0.14) 55%, transparent 72%)',
            }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              className="relative z-10 mx-auto max-w-sm sm:max-w-none"
            >
              {slide.visual === 'platform' && (
                <>
                  <img
                    src={asset(onLight ? 'hero-platform-light.png' : 'hero-platform.png')}
                    alt="27 Markets trading platform on laptop and mobile"
                    className={`w-full select-none lg:scale-105 ${onLight ? '' : 'hero-media-fade'}`}
                  />
                  <HeroFloatingCards quotes={quotes} />
                </>
              )}
              {slide.visual === 'globe' && (
                <div className="relative">
                  <img
                    src={asset('globe.png')}
                    alt="27 Markets global partner network"
                    className="globe-pulse w-full select-none"
                  />
                  <span
                    className="globe-sweep"
                    aria-hidden
                    style={{
                      WebkitMaskImage: `url(${asset('globe.png')})`,
                      maskImage: `url(${asset('globe.png')})`,
                    }}
                  />
                </div>
              )}
              {slide.visual === 'coins' && (
                <img
                  src={asset('growth-coins.png')}
                  alt="Growing trading returns"
                  className="mx-auto w-full max-w-md select-none drop-shadow-[0_24px_70px_rgba(225,29,46,0.3)]"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Controls — hidden in single (de-carouseled) mode */}
      {!single && (
        <div className="container-bleed relative z-20 mt-1 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-brand-500/40 hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-gray-300 transition hover:border-brand-500/40 hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <div className="ml-2 flex items-center gap-2">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show slide ${i + 1}: ${s.pill}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all ${
                  i === index ? 'w-6 bg-brand-500' : 'w-2 bg-white/25 hover:bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
