import { motion } from 'framer-motion'
import { ArrowRight, Percent, Boxes, Scale, Rocket, TrendingUp, ShieldCheck, type LucideIcon } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'

interface Callout {
  tag: string
  icon: LucideIcon
  title: string
  desc: string
  /** Text alignment: left column reads right-aligned, right column left-aligned. */
  side: 'left' | 'right'
}

const CALLOUTS: Callout[] = [
  {
    tag: 'Spread',
    icon: Percent,
    title: 'Tightest Spreads',
    desc: 'Raw spreads from 0.0 pips designed to enhance performance across global markets.',
    side: 'left',
  },
  {
    tag: 'Instruments',
    icon: Boxes,
    title: 'Trading Instruments',
    desc: 'Access 100+ instruments across multiple asset classes and seven trading markets.',
    side: 'left',
  },
  {
    tag: 'Leverage',
    icon: Scale,
    title: 'Best Leverage',
    desc: 'Flexible leverage up to 1:100 with minimal margin requirements from 0.1%.',
    side: 'right',
  },
  {
    tag: 'Execution',
    icon: Rocket,
    title: 'Ultra-fast Execution',
    desc: 'Top-tier liquidity for fast, secure execution in under 30ms — no dealing desk.',
    side: 'right',
  },
]

function CalloutCard({ tag, icon: Icon, title, desc, side }: Callout) {
  return (
    <motion.div
      variants={fadeUp}
      className={`group flex flex-col gap-2 ${side === 'right' ? 'lg:items-start lg:text-left' : 'lg:items-end lg:text-right'}`}
    >
      <span
        className={`inline-flex items-center gap-2 ${side === 'right' ? '' : 'lg:flex-row-reverse'}`}
      >
        <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 transition-all duration-300 group-hover:bg-brand-500 group-hover:text-onaccent group-hover:shadow-[0_0_22px_rgba(225,29,46,0.5)]">
          <Icon className="h-5 w-5" />
        </span>
        <span className="section-eyebrow">{tag}</span>
      </span>
      <h3 className="font-display text-lg font-semibold text-white">{title}</h3>
      <p className="max-w-xs text-sm leading-relaxed text-gray-400">{desc}</p>
    </motion.div>
  )
}

export function HeroShowcase({ onLight }: { onLight?: boolean }) {
  const themeLight = useThemeSafe() === 'light'
  const light = onLight ?? themeLight
  const device = light ? 'hero-platform-light.webp' : 'hero-platform.webp'
  const left = CALLOUTS.filter((c) => c.side === 'left')
  const right = CALLOUTS.filter((c) => c.side === 'right')

  return (
    <div className="container-x relative z-10 pt-6 pb-6 sm:pt-8 lg:pt-10">
      {/* Headline */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="mx-auto max-w-3xl text-center"
      >
        <p className="section-eyebrow mb-3">Trusted · Regulated · Global</p>
        <h1 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
          Invest with a world-class <span className="text-gradient-red">online trading</span> platform
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-gray-300">
          Trade 100+ financial products with tight spreads, deep liquidity, and lightning-fast
          execution on a platform built for serious traders.
        </p>
      </motion.div>

      {/* Device + flanking callouts */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="mt-10 grid items-center gap-8 lg:mt-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,1fr)] lg:gap-6"
      >
        {/* Left callouts */}
        <div className="order-2 flex flex-col gap-8 sm:flex-row sm:gap-6 lg:order-1 lg:flex-col lg:gap-12">
          {left.map((c) => (
            <CalloutCard key={c.tag} {...c} />
          ))}
        </div>

        {/* Device */}
        <div className="relative order-1 lg:order-2">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[75%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial-red opacity-70 blur-3xl"
          />
          <motion.img
            variants={fadeUp}
            src={asset(device)}
            alt="27 Markets trading platform on desktop and mobile"
            className="animate-float relative mx-auto w-full max-w-xl select-none drop-shadow-[0_30px_80px_rgba(225,29,46,0.28)]"
            style={{ animationDuration: '9s' }}
          />

          {/* Floating chips (lg only) */}
          <div className="pointer-events-none absolute inset-0 z-10 hidden lg:block" aria-hidden>
            <div
              className="glass-panel animate-float absolute left-0 top-[14%] flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/15"
              style={{ animationDuration: '7s' }}
            >
              <span className="font-semibold text-white">EUR/USD</span>
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <TrendingUp className="h-3.5 w-3.5" /> 1.0842
              </span>
            </div>
            <div
              className="glass-panel animate-float absolute bottom-[12%] right-0 flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/15"
              style={{ animationDuration: '9s', animationDelay: '0.8s' }}
            >
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              <span className="font-semibold text-white">Regulated &amp; segregated</span>
            </div>
          </div>
        </div>

        {/* Right callouts */}
        <div className="order-3 flex flex-col gap-8 sm:flex-row sm:gap-6 lg:flex-col lg:gap-12">
          {right.map((c) => (
            <CalloutCard key={c.tag} {...c} />
          ))}
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="mt-10 flex flex-col items-center gap-3"
      >
        <p className="text-sm font-medium text-gray-400">Maximize your profits effectively</p>
        <Link to="/register">
          <Button size="lg" className="gap-2">
            Open Live Account <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
