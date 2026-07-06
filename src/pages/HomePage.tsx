import { motion } from 'framer-motion'
import { ArrowRight, Layers, Rocket, Gauge, ShieldCheck, Headphones } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { Parallax } from '@/components/Parallax'
import { SectionHeading } from '@/components/SectionHeading'
import { LiveTicker } from '@/components/marketing/LiveTicker'
import { SignalFlow } from '@/components/marketing/SignalFlow'
import { FeatureCard } from '@/components/marketing/FeatureCard'
import { HeroSlider } from '@/components/marketing/HeroSlider'
import { HeroShowcase } from '@/components/marketing/HeroShowcase'
import { ChartGridBackdrop } from '@/components/marketing/ChartGridBackdrop'
import { CandlestickBackdrop } from '@/components/marketing/CandlestickBackdrop'
import { ChartLineBackdrop } from '@/components/marketing/ChartLineBackdrop'
import { PartnerSection } from '@/components/marketing/PartnerSection'
import { PaymentsCluster } from '@/components/marketing/PaymentsCluster'
import { MarketCard } from '@/components/marketing/MarketCard'
import { CTABand } from '@/components/marketing/CTABand'
import { TrustRegulationBand } from '@/components/marketing/TrustRegulationBand'
import { PlatformShowcase } from '@/components/marketing/PlatformShowcase'
import { OnboardingSteps } from '@/components/marketing/OnboardingSteps'
import { Testimonials } from '@/components/marketing/Testimonials'
import { FaqSection } from '@/components/marketing/FaqSection'
import { fadeUp, staggerContainer, cardStagger } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { whyFeatures, marketCategories } from '@/mock/content'

const heroStats = [
  { icon: Layers, image: '/stat-pips.png', value: '0.0', label: 'Pips from spreads' },
  { icon: Rocket, image: '/stat-leverage.png', value: '1:500', label: 'Up to leverage' },
  { icon: Gauge, image: '/stat-execution.png', value: '<30ms', label: 'Ultra-fast execution' },
  { icon: ShieldCheck, image: '/stat-liquidity.png', value: 'Tier-1', label: 'Liquidity providers' },
  { icon: Headphones, image: '/stat-support.png', value: '24/5', label: 'Customer support' },
]

// Live quotes powering the dark-theme hero slider's floating price chips.
const HERO_CHIPS = ['BINANCE:BTCUSDT', 'OANDA:XAU_USD', 'OANDA:EUR_USD']

export default function HomePage() {
  const onLight = useThemeSafe() === 'light'
  const { list: heroQuotes } = useLiveQuotes(HERO_CHIPS)
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="hero-light-veil pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="hero-worldmap pointer-events-none absolute inset-0"
          style={{
            WebkitMaskImage: `url(${asset('world-dots.png')})`,
            maskImage: `url(${asset('world-dots.png')})`,
          }}
          aria-hidden
        />
        <div className="grid-bg hero-grid pointer-events-none absolute inset-0 opacity-40" />
        {onLight && (
          <ChartGridBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] w-full opacity-[0.18]" />
        )}
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 bg-radial-red opacity-70 blur-2xl" />
        <SignalFlow className="opacity-60" />

        {/* Two homepage hero designs: GTC-style device showcase on the light theme,
            the original auto-advancing slider on the dark theme. */}
        {onLight ? (
          <HeroShowcase onLight={onLight} />
        ) : (
          <HeroSlider onLight={onLight} quotes={heroQuotes} single />
        )}

        {/* LIVE TICKER (real-time, backend SSE) */}
        <LiveTicker />

        {/* STATS STRIP */}
        <div className="container-bleed relative z-10 pt-6 pb-8">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.4 }}
            className="glass-panel grid grid-cols-2 divide-white/[0.05] sm:grid-cols-3 lg:grid-cols-5 lg:divide-x"
          >
            {heroStats.map((s) => (
              <motion.div
                key={s.label}
                variants={fadeUp}
                className="group flex items-center gap-3 p-5 transition-colors hover:bg-brand-500/[0.05]"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-onaccent group-hover:shadow-[0_0_20px_rgba(225,29,46,0.5)]">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-display text-xl font-bold tabular-nums text-white">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          <p className="mt-3 px-1 text-center text-[11px] text-gray-500">
            Figures shown are indicative of target trading conditions and may vary by account type
            and market.
          </p>
        </div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center lg:flex">
          <span className="scroll-cue block opacity-50" />
        </div>
      </section>

      {/* TRUST · REGULATION · SECURITY BAND */}
      <TrustRegulationBand />

      {/* WHY CHOOSE US */}
      <section className="section-alt relative overflow-hidden pb-16 pt-8 sm:pb-20 sm:pt-12">
        <CandlestickBackdrop className="section-motif pointer-events-none absolute inset-x-0 bottom-0 h-[85%] w-full" />
        <div className="container-x relative z-10 grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,3fr)] lg:items-start">
          <SectionHeading
            align="left"
            eyebrow="Why 27 Markets"
            title={
              <>
                Built for traders. Powered by technology.
              </>
            }
            description="We combine advanced technology, deep liquidity, and transparent conditions to deliver a superior trading experience."
          />
          <motion.div
            variants={cardStagger}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="flex flex-wrap justify-center gap-3"
          >
            {whyFeatures.map((f) => (
              <div
                key={f.title}
                className="w-[calc(50%-0.375rem)] sm:w-[calc(33.333%-0.5rem)] lg:w-[calc(20%-0.6rem)]"
              >
                <FeatureCard {...f} />
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* GROWTH HIGHLIGHT */}
      <section className="relative overflow-hidden py-16 sm:py-20">
        <ChartLineBackdrop className="section-motif pointer-events-none absolute inset-x-0 bottom-0 h-[70%] w-full" />
        <div className="container-x relative z-10 grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <Parallax amount={55}>
              <img
                src={asset('growth-coins.png')}
                alt="Growing returns"
                className="mx-auto w-full max-w-md select-none drop-shadow-[0_24px_70px_rgba(225,29,46,0.3)]"
              />
            </Parallax>
          </Reveal>
          <Reveal>
            <p className="section-eyebrow mb-3">Built for growth</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Keep more of every move
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-gray-300">
              Tight spreads, fast execution, and transparent pricing mean more of every winning
              trade stays in your account. Scale your strategy with leverage up to 1:500 across
              100+ global markets.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-200">
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Spreads from 0.0 pips
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Sub-30ms execution, no dealing desk
              </li>
              <li className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> Transparent pricing — no hidden fees
              </li>
            </ul>
            <Link to="/accounts" className="mt-7 inline-block">
              <Button className="gap-2">
                Explore accounts <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* PLATFORM & MOBILE SHOWCASE */}
      <PlatformShowcase />

      {/* PARTNER */}
      <PartnerSection />

      {/* MARKETS PREVIEW */}
      <section className="relative overflow-hidden py-20 sm:py-24">
        <div
          aria-hidden
          className="section-motif pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] max-w-none -translate-x-1/2 -translate-y-1/2"
          style={{
            background: 'rgb(225 29 46)',
            WebkitMaskImage: `url(${asset('world-dots.png')})`,
            maskImage: `url(${asset('world-dots.png')})`,
            WebkitMaskRepeat: 'no-repeat',
            maskRepeat: 'no-repeat',
            WebkitMaskPosition: 'center',
            maskPosition: 'center',
            WebkitMaskSize: 'contain',
            maskSize: 'contain',
          }}
        />
        <div className="container-x relative z-10">
        <SectionHeading
          eyebrow="Global Markets"
          title="Trade 100+ global markets with confidence"
          description="Diversify your portfolio with 100+ instruments across multiple asset classes."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {marketCategories.map((c) => (
            <MarketCard key={c.key} category={c} />
          ))}
        </motion.div>
        <Reveal className="mt-10 text-center">
          <Link to="/markets">
            <Button variant="outline" size="lg" className="gap-2">
              View All Instruments <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Reveal>
        </div>
      </section>

      {/* FUNDING & PAYMENTS (light-theme design only) */}
      {onLight && <PaymentsCluster />}

      {/* GETTING STARTED — 4 STEPS */}
      <OnboardingSteps />

      {/* SOCIAL PROOF */}
      <Testimonials />

      {/* FAQ */}
      <FaqSection />

      <CTABand />
    </>
  )
}
