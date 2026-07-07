import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Gauge, Layers, Moon, Zap, ArrowRight, type LucideIcon } from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Button } from '@/components/ui'
import { accountTiers } from '@/mock/content'
import { useT } from '@/i18n/LanguageContext'
import { staggerContainer, fadeUp } from '@/lib/motion'

// Per-account conditions. Values are indicative of target trading conditions.
const CONDITIONS: { labelKey: string; values: Record<string, string> }[] = [
  { labelKey: 'tcp.r.spread', values: { Standard: '0.8 pips', 'Raw Spread': '0.0 pips', VIP: '0.0 pips' } },
  { labelKey: 'tcp.r.comm', values: { Standard: 'None', 'Raw Spread': '$7', VIP: 'From $3' } },
  { labelKey: 'tcp.r.min', values: { Standard: '$50', 'Raw Spread': '$50', VIP: '$50' } },
  { labelKey: 'tcp.r.lev', values: { Standard: 'Up to 1:10', 'Raw Spread': 'Up to 1:50', VIP: 'Up to 1:100' } },
  { labelKey: 'tcp.r.ccy', values: { Standard: 'USD', 'Raw Spread': 'USD', VIP: 'USD' } },
  { labelKey: 'tcp.r.support', values: { Standard: '24/5', 'Raw Spread': '24/5 priority', VIP: '24/5 priority' } },
  { labelKey: 'tcp.r.manager', values: { Standard: '—', 'Raw Spread': '—', VIP: 'Included' } },
]

// Indicative typical spreads by market — mark clearly as indicative.
const SPREADS: { mKey: string; from: string }[] = [
  { mKey: 'tcp.m1', from: '0.0 pips' },
  { mKey: 'tcp.m2', from: '0.4 pips' },
  { mKey: 'tcp.m3', from: '12 cents' },
  { mKey: 'tcp.m4', from: '0.4 pts' },
  { mKey: 'tcp.m5', from: '0.03' },
  { mKey: 'tcp.m6', from: 'Variable' },
  { mKey: 'tcp.m7', from: 'Variable' },
]

const TERMS: { icon: LucideIcon; tKey: string; bKey: string }[] = [
  { icon: Layers, tKey: 'tcp.t1t', bKey: 'tcp.t1b' },
  { icon: Moon, tKey: 'tcp.t2t', bKey: 'tcp.t2b' },
  { icon: Zap, tKey: 'tcp.t3t', bKey: 'tcp.t3b' },
]

export default function TradingConditionsPage() {
  const t = useT()
  // Word values resolve via tcp.v.* / tcp.sv.*; numbers & symbols pass through.
  const val = (v: string) => {
    for (const ns of ['tcp.v.', 'tcp.sv.']) {
      const key = `${ns}${v}`
      const r = t(key)
      if (r !== key) return r
    }
    return v
  }
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Trading Conditions']}
        title={t('tcp.title')}
        description={t('tcp.desc')}
      />

      {/* Account comparison */}
      <section className="container-x py-14">
        <SectionHeading
          eyebrow={t('tcp.acctEyebrow')}
          title={t('tcp.acctTitle')}
          description={t('tcp.acctDesc')}
        />
        <Reveal className="mt-10">
          <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-white/[0.08] bg-white/[0.02]">
                  <th className="px-5 py-4 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                    {t('tcp.condition')}
                  </th>
                  {accountTiers.map((tier) => (
                    <th key={tier.name} className="px-5 py-4 text-left">
                      <span className="flex items-center gap-2 font-display text-base font-semibold text-white">
                        {tier.name}
                        {tier.popular && (
                          <span className="rounded-full bg-brand-500/15 px-2 py-0.5 text-[10px] font-medium text-brand-300">
                            {t('accts.popular')}
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-normal text-gray-500">
                        {t(`accts.aud.${tier.name.replace(/\s/g, '')}`)}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.05]">
                {CONDITIONS.map((row) => (
                  <tr key={row.labelKey} className="transition-colors hover:bg-white/[0.02]">
                    <td className="px-5 py-3.5 font-medium text-gray-300">{t(row.labelKey)}</td>
                    {accountTiers.map((tier) => (
                      <td key={tier.name} className="px-5 py-3.5 tabular-nums text-white">
                        {row.values[tier.name] ? val(row.values[tier.name]) : '—'}
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
              {t('tcp.openAccount')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/accounts">
            <Button variant="outline" size="lg">
              {t('tcp.compareDetail')}
            </Button>
          </Link>
        </Reveal>
      </section>

      {/* Pricing model */}
      <section className="section-alt relative overflow-hidden py-14">
        <div className="container-x">
          <SectionHeading
            eyebrow={t('tcp.priceEyebrow')}
            title={t('tcp.priceTitle')}
            description={t('tcp.priceDesc')}
          />
          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <Reveal className="glass-panel p-7">
              <h3 className="font-display text-xl font-semibold text-white">{t('tcp.stdTitle')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{t('tcp.stdBody')}</p>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-300">
                <div className="font-medium text-gray-400">{t('tcp.example')}</div>
                <div className="mt-1 font-mono text-white">{t('tcp.stdCalc')}</div>
              </div>
            </Reveal>
            <Reveal className="glass-panel p-7">
              <h3 className="font-display text-xl font-semibold text-white">{t('tcp.rawTitle')}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-400">{t('tcp.rawBody')}</p>
              <div className="mt-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-gray-300">
                <div className="font-medium text-gray-400">{t('tcp.example')}</div>
                <div className="mt-1 font-mono text-white">{t('tcp.rawCalc')}</div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Indicative spreads by market */}
      <section className="container-x py-14">
        <SectionHeading
          eyebrow={t('tcp.spEyebrow')}
          title={t('tcp.spTitle')}
          description={t('tcp.spDesc')}
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
              key={s.mKey}
              variants={fadeUp}
              className="glass-panel flex items-center justify-between p-4"
            >
              <span className="text-sm text-gray-300">{t(s.mKey)}</span>
              <span className="font-mono text-sm font-semibold text-white">
                {t('tcp.from')} {val(s.from)}*
              </span>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-xs text-gray-500">{t('tcp.spFoot')}</p>
      </section>

      {/* Key terms */}
      <section className="section-alt py-14">
        <div className="container-x">
          <SectionHeading eyebrow={t('tcp.termsEyebrow')} title={t('tcp.termsTitle')} />
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.2 }}
            className="mt-10 grid gap-5 md:grid-cols-3"
          >
            {TERMS.map((term) => (
              <motion.div key={term.tKey} variants={fadeUp} className="glass-panel card-lift p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                  <term.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-white">{t(term.tKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t(term.bKey)}</p>
              </motion.div>
            ))}
          </motion.div>
          <div className="mx-auto mt-8 flex max-w-3xl items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
            <Gauge className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>{t('tcp.risk')}</span>
          </div>
        </div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
