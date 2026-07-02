import { motion } from 'framer-motion'
import { ArrowRight, Layers, Rocket, Gauge, ShieldCheck, Headphones, Lock, Zap, Building2, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { Parallax } from '@/components/Parallax'
import { SectionHeading } from '@/components/SectionHeading'
import { LiveTicker } from '@/components/marketing/LiveTicker'
import { SignalFlow } from '@/components/marketing/SignalFlow'
import { FeatureCard } from '@/components/marketing/FeatureCard'
import { PartnerSection } from '@/components/marketing/PartnerSection'
import { MarketCard } from '@/components/marketing/MarketCard'
import { CTABand } from '@/components/marketing/CTABand'
import { fadeUp, staggerContainer, cardStagger, slideInLeft } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { whyFeatures, marketCategories } from '@/mock/content'

const heroStats = [
  { icon: Layers, value: '0.0', label: 'Pips from spreads' },
  { icon: Rocket, value: '1:500', label: 'Up to leverage' },
  { icon: Gauge, value: '<30ms', label: 'Ultra-fast execution' },
  { icon: ShieldCheck, value: 'Tier-1', label: 'Liquidity providers' },
  { icon: Headphones, value: '24/5', label: 'Customer support' },
]

const trustPoints = [
  { icon: ShieldCheck, label: 'Segregated client funds' },
  { icon: Lock, label: 'Bank-grade encryption' },
  { icon: Zap, label: 'No dealing desk' },
  { icon: Building2, label: 'Institutional liquidity' },
  { icon: Eye, label: 'Transparent pricing' },
]

// Live mini-quote chips that float over the hero device (foreground depth + proof).
const HERO_CHIPS = ['BINANCE:BTCUSDT', 'OANDA:XAU_USD', 'OANDA:EUR_USD']
const HERO_LABEL: Record<string, string> = {
  'BINANCE:BTCUSDT': 'BTC/USD',
  'OANDA:XAU_USD': 'Gold',
  'OANDA:EUR_USD': 'EUR/USD',
}
const HERO_CHIP_POS = ['left-[-3%] top-[12%]', 'right-[-2%] bottom-[16%]']
function heroPrice(p: number): string {
  const d = p >= 100 ? 2 : 4
  return p.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

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
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 bg-radial-red opacity-70 blur-2xl" />
        <SignalFlow className="opacity-60" />

        <div className="container-bleed relative grid items-center gap-8 py-3 sm:grid-cols-[1fr_1.1fr] sm:gap-10 sm:py-5">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative z-10"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1 text-xs font-medium text-white"
            >
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-brand-500" />
              Next-generation multi-asset broker
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-5 font-display text-5xl font-bold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              Trade
              <br />
              Beyond
              <br />
              <span className="relative inline-block">
                <span
                  className={
                    onLight
                      ? 'bg-gradient-to-br from-brand-500 to-brand-700 bg-clip-text text-transparent'
                      : 'text-white'
                  }
                >
                  Limits
                </span>
                <span className="hero-underline absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand-500 to-transparent" />
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-sm font-medium tracking-wide text-white/80">
              Precision · Performance · Partnership
            </motion.p>

            <motion.p variants={fadeUp} className="mt-3 max-w-md text-base leading-relaxed text-gray-300">
              Access global financial markets through a broker built for traders, partners, and
              long-term growth.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-7 flex flex-wrap items-center gap-3">
              <Link to="/register">
                <Button
                  size="lg"
                  className="gap-2 shadow-[0_0_34px_-4px_rgba(225,29,46,0.55)] transition-shadow hover:shadow-[0_0_48px_-2px_rgba(225,29,46,0.7)]"
                >
                  Open Live Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  Try Free Demo
                </Button>
              </Link>
            </motion.div>

            <motion.p
              variants={fadeUp}
              className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-gray-400"
            >
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-500" /> Segregated funds
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-brand-500" /> No dealing desk
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5 text-brand-500" /> 2-minute setup
              </span>
            </motion.p>
          </motion.div>

          <motion.div variants={slideInLeft} initial="hidden" animate="show" className="relative">
            {/* Radar-ring signature behind the device — subtle trading motif */}
            <div
              aria-hidden
              className="hero-rings pointer-events-none absolute left-1/2 top-1/2 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2"
            />
            {/* Focused brand glow behind the device — visible on light AND dark */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 h-[72%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
              style={{
                background: onLight
                  ? 'radial-gradient(closest-side, rgba(225,29,46,0.20), rgba(225,29,46,0.06) 55%, transparent 76%)'
                  : 'radial-gradient(closest-side, rgba(225,29,46,0.52), rgba(225,29,46,0.14) 55%, transparent 72%)',
              }}
            />
            <div className="drift relative z-10 mx-auto max-w-sm sm:max-w-none">
              <img
                src={asset(onLight ? 'hero-platform-light.png' : 'hero-platform.png')}
                alt="27 Markets trading platform on laptop and mobile"
                className="w-full select-none lg:scale-105"
              />
            </div>

            {/* Live mini-quote chips — floating foreground proof */}
            <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
              {heroQuotes.slice(0, 2).map((q, i) => {
                const up = (q.changePct ?? 0) >= 0
                return (
                  <div
                    key={q.symbol}
                    className={`glass-panel animate-float absolute ${HERO_CHIP_POS[i]} flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/15`}
                    style={{ animationDuration: `${7 + i * 2}s`, animationDelay: `${i * 0.8}s` }}
                  >
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-success" />
                    <span className="font-semibold text-white">{HERO_LABEL[q.symbol] ?? q.symbol}</span>
                    <span className="font-mono tabular-nums text-white">{heroPrice(q.price)}</span>
                    {q.changePct !== undefined && (
                      <span className={`font-mono ${up ? 'text-success' : 'text-danger'}`}>
                        {up ? '▲' : '▼'}
                        {Math.abs(q.changePct).toFixed(2)}%
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </motion.div>
        </div>

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
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-white group-hover:shadow-[0_0_20px_rgba(225,29,46,0.5)]">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-display text-xl font-bold tabular-nums text-white">{s.value}</div>
                  <div className="text-xs text-gray-400">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Scroll cue */}
        <div className="pointer-events-none absolute inset-x-0 bottom-2 hidden justify-center lg:flex">
          <span className="scroll-cue block opacity-50" />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-ink-300/60 bg-ink-850/40">
        <div className="container-x flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-4">
          {trustPoints.map((t) => (
            <span key={t.label} className="inline-flex items-center gap-2 text-sm font-medium text-gray-400">
              <t.icon className="h-4 w-4 text-brand-500" />
              {t.label}
            </span>
          ))}
        </div>
      </section>

      {/* WHY CHOOSE US */}
      <section className="section-alt relative overflow-hidden pb-16 pt-8 sm:pb-20 sm:pt-12">
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
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
          >
            {whyFeatures.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* GROWTH HIGHLIGHT */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
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
            <p className="mt-4 max-w-lg leading-relaxed text-white">
              Tight spreads, fast execution, and transparent pricing mean more of every winning
              trade stays in your account. Scale your strategy with leverage up to 1:500 across
              100+ global markets.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-white">
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

      {/* PARTNER */}
      <PartnerSection />

      {/* MARKETS PREVIEW */}
      <section className="container-x py-20 sm:py-24">
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
      </section>

      <CTABand />
    </>
  )
}
