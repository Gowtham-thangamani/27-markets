import { motion } from 'framer-motion'
import { ArrowRight, Layers, Rocket, Gauge, ShieldCheck, Headphones } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { LiveTicker } from '@/components/marketing/LiveTicker'
import { SignalFlow } from '@/components/marketing/SignalFlow'
import { FeatureCard } from '@/components/marketing/FeatureCard'
import { MarketCard } from '@/components/marketing/MarketCard'
import { PartnerSection } from '@/components/marketing/PartnerSection'
import { CTABand } from '@/components/marketing/CTABand'
import { fadeUp, staggerContainer, slideInLeft } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { whyFeatures, marketCategories } from '@/mock/content'

const heroStats = [
  { icon: Layers, value: '0.0', label: 'Pips from spreads' },
  { icon: Rocket, value: '1:500', label: 'Up to leverage' },
  { icon: Gauge, value: '<30ms', label: 'Ultra-fast execution' },
  { icon: ShieldCheck, value: 'Tier-1', label: 'Liquidity providers' },
  { icon: Headphones, value: '24/5', label: 'Customer support' },
]

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 opacity-40" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[60rem] -translate-x-1/2 bg-radial-red opacity-70 blur-2xl" />
        <SignalFlow className="opacity-60" />

        <div className="container-bleed relative grid items-center gap-8 py-6 sm:grid-cols-[1fr_1.1fr] sm:gap-10 sm:py-10">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative z-10"
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/[0.08] px-3 py-1 text-xs font-medium text-brand-300"
            >
              <span className="h-1.5 w-1.5 animate-pulse-glow rounded-full bg-brand-500" />
              Next-generation multi-asset broker
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="mt-5 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-7xl"
            >
              Trade
              <br />
              Beyond
              <br />
              <span className="text-gradient-red">Limits</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mt-5 text-sm font-medium text-brand-300/90">
              Precision · Performance · Partnership
            </motion.p>

            <motion.p variants={fadeUp} className="mt-3 max-w-md text-base leading-relaxed text-gray-400">
              Access global financial markets through a broker built for traders, partners, and
              long-term growth.
            </motion.p>

            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap gap-3">
              <Link to="/register">
                <Button size="lg" className="gap-2">
                  Open Live Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  Try Free Demo
                </Button>
              </Link>
            </motion.div>
          </motion.div>

          <motion.div variants={slideInLeft} initial="hidden" animate="show" className="relative">
            <div className="drift mx-auto max-w-sm sm:max-w-none">
              <img
                src={asset('hero-platform.png')}
                alt="27 Markets trading platform on laptop and mobile"
                className="w-full select-none drop-shadow-[0_30px_90px_rgba(225,29,46,0.25)] lg:scale-105"
              />
            </div>
          </motion.div>
        </div>

        {/* STATS STRIP */}
        <div className="container-bleed relative z-10 pb-14">
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
                className="flex items-center gap-3 p-5"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="font-display text-xl font-bold text-white">{s.value}</div>
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

      {/* LIVE TICKER (real-time, backend SSE) */}
      <LiveTicker />

      {/* WHY CHOOSE US */}
      <section className="container-x py-20 sm:py-24">
        <SectionHeading
          align="left"
          eyebrow="Why 27 Markets"
          title={
            <>
              Built for traders.
              <br />
              Powered by technology.
            </>
          }
          description="We combine advanced technology, deep liquidity, and transparent conditions to deliver a superior trading experience."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        >
          {whyFeatures.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </motion.div>
      </section>

      {/* GROWTH HIGHLIGHT */}
      <section className="container-x py-16 sm:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <Reveal>
            <img
              src={asset('growth-coins.png')}
              alt="Growing returns"
              className="mx-auto w-full max-w-md select-none drop-shadow-[0_24px_70px_rgba(225,29,46,0.3)]"
            />
          </Reveal>
          <Reveal>
            <p className="section-eyebrow mb-3">Built for growth</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Keep more of every move
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-gray-400">
              Tight spreads, fast execution, and transparent pricing mean more of every winning
              trade stays in your account. Scale your strategy with leverage up to 1:500 across
              100+ global markets.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-gray-300">
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
