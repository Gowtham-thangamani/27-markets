import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Gauge, Layers, Moon, Zap, ArrowRight, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Button } from '@/components/ui'
import { accountTiers } from '@/mock/content'
import { staggerContainer, fadeUp } from '@/lib/motion'

// Per-account conditions. Values are indicative of target trading conditions.
const CONDITIONS: { label: string; values: Record<string, string> }[] = [
  { label: 'Spread from', values: { Standard: '0.8 pips', 'Raw Spread': '0.0 pips', VIP: '0.0 pips' } },
  { label: 'Commission (per lot)', values: { Standard: 'None', 'Raw Spread': '$7', VIP: 'From $3' } },
  { label: 'Minimum deposit', values: { Standard: '$50', 'Raw Spread': '$50', VIP: '$50' } },
  { label: 'Maximum leverage', values: { Standard: 'Up to 1:500', 'Raw Spread': 'Up to 1:500', VIP: 'Up to 1:500' } },
  { label: 'Account currency', values: { Standard: 'USD', 'Raw Spread': 'USD', VIP: 'USD' } },
  { label: 'Support', values: { Standard: '24/5', 'Raw Spread': '24/5 priority', VIP: '24/5 priority' } },
  { label: 'Dedicated account manager', values: { Standard: '—', 'Raw Spread': '—', VIP: 'Included' } },
]

// Indicative typical spreads by market — mark clearly as indicative.
const SPREADS: { market: string; from: string }[] = [
  { market: 'Forex — Majors (EUR/USD)', from: '0.0 pips' },
  { market: 'Forex — Minors', from: '0.4 pips' },
  { market: 'Gold (XAU/USD)', from: '12 cents' },
  { market: 'Indices (US500)', from: '0.4 pts' },
  { market: 'Oil (WTI)', from: '0.03' },
  { market: 'Shares CFDs', from: 'Variable' },
  { market: 'Crypto CFDs (BTC/USD)', from: 'Variable' },
]

const TERMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Layers,
    title: 'Leverage & margin',
    body: 'Trade with leverage up to 1:500. Margin is the deposit required to open a position; higher leverage means less margin but greater risk.',
  },
  {
    icon: Moon,
    title: 'Swaps & overnight',
    body: 'Positions held overnight may be credited or debited a swap based on the interest-rate differential of the instrument. Swap-free options may apply.',
  },
  {
    icon: Zap,
    title: 'Execution',
    body: 'Market execution with no dealing desk. The price you see is the price you trade, subject to available liquidity and market conditions.',
  },
]

export default function TradingConditionsPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Trading Conditions']}
        title="Transparent trading conditions"
        description="See exactly what you'll pay before you open an account — spreads, commissions, leverage, and swaps, laid out per account type."
      />

      {/* Account comparison */}
      <section className="container-x py-14">
        <SectionHeading
          eyebrow="Account types"
          title="Choose the account that fits your style"
          description="Commission-free simplicity, raw spreads for active traders, or VIP terms for high volume."
        />
        <Reveal className="mt-10">
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    Condition
                  </th>
                  {accountTiers.map((t) => (
                    <th key={t.name} className="px-5 py-4 text-left">
                      <span className="flex items-center gap-2 font-display text-base font-semibold text-white">
                        {t.name}
                        {t.popular && (
                          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                            Popular
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-normal text-gray-500">{t.audience}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {CONDITIONS.map((row) => (
                  <tr key={row.label} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-gray-300">{row.label}</td>
                    {accountTiers.map((t) => (
                      <td key={t.name} className="px-5 py-3.5 tabular-nums text-white">
                        {row.values[t.name] ?? '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal className="mt-6 flex flex-wrap gap-3">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Open an account <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" size="lg">
              Compare accounts in detail
            </Button>
          </Link>
        </Reveal>
      </section>

      {/* Pricing model */}
      <section className="section-alt relative overflow-hidden py-14">
        <div className="container-x">
          <SectionHeading
            eyebrow="How pricing works"
            title="Two simple pricing models"
            description="Pay through the spread, or trade raw spreads with a flat commission — whichever suits you."
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal className="glass-panel p-7">
              <h3 className="font-display text-xl font-semibold text-white">Standard — spread only</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                A single, all-in spread with <span className="text-white">no separate commission</span>.
                Simple and predictable — ideal if you prefer one number to watch.
              </p>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-300">
                <div className="font-medium text-gray-400">Example — 1 lot EUR/USD</div>
                <div className="mt-1 font-mono text-white">Spread ~0.8 pips ≈ $8 · commission $0</div>
              </div>
            </Reveal>
            <Reveal className="glass-panel p-7">
              <h3 className="font-display text-xl font-semibold text-white">Raw — spread + commission</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">
                Raw interbank spreads from <span className="text-white">0.0 pips</span> plus a flat{' '}
                <span className="text-white">$7 commission per lot</span>. Lower total cost for active,
                higher-volume traders.
              </p>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-300">
                <div className="font-medium text-gray-400">Example — 1 lot EUR/USD</div>
                <div className="mt-1 font-mono text-white">Spread ~0.0 pips + $7 commission ≈ $7 total</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Indicative spreads by market */}
      <section className="container-x py-14">
        <SectionHeading
          eyebrow="Spreads by market"
          title="Typical spreads across asset classes"
          description="Indicative starting spreads on the Raw account. Actual spreads vary with liquidity and market conditions."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {SPREADS.map((s) => (
            <motion.div
              key={s.market}
              variants={fadeUp}
              className="glass-panel flex items-center justify-between p-4"
            >
              <span className="text-sm text-gray-300">{s.market}</span>
              <span className="font-mono text-sm font-semibold text-white">from {s.from}*</span>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-xs text-gray-500">
          *Figures are indicative of target trading conditions and vary by account type, instrument,
          and market conditions.
        </p>
      </section>

      {/* Key terms */}
      <section className="section-alt py-14">
        <div className="container-x">
          <SectionHeading eyebrow="Good to know" title="Key trading terms" />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-5 md:grid-cols-3"
          >
            {TERMS.map((t) => (
              <motion.div key={t.title} variants={fadeUp} className="glass-panel card-lift p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <t.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{t.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t.body}</p>
              </motion.div>
            ))}
          </motion.div>
          <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
            <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>
              Trading leveraged products such as CFDs carries a high risk of losing money rapidly and
              may not be suitable for all investors. All conditions shown are indicative and subject to
              change; confirm live pricing in the platform before trading.
            </span>
          </div>
        </div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
