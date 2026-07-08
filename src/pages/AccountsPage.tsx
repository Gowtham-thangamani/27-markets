import { motion } from 'framer-motion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { PageHeader } from '@/components/marketing/PageHeader'
import { AccountCard } from '@/components/marketing/AccountCard'
import { CTABand } from '@/components/marketing/CTABand'
import { Accordion } from '@/components/ui'
import { staggerContainer } from '@/lib/motion'
import { accountTiers } from '@/mock/content'
import { useAccountTypes, type AccountTypeConfig } from '@/lib/useAccountTypes'
import { useT } from '@/i18n/LanguageContext'

const comparison = [
  { labelKey: 'acp.r.min', values: ['$50', '$200', '$5,000'] },
  { labelKey: 'acp.r.spread', values: ['0.8 pips', '0.0 pips', '0.0 pips'] },
  { labelKey: 'acp.r.comm', values: ['None', '$7 / lot', 'Custom'] },
  { labelKey: 'acp.r.lev', values: ['1:10', '1:50', '1:100'] },
  { labelKey: 'acp.r.markets', values: ['Yes', 'Yes', 'Yes'] },
  { labelKey: 'acp.r.manager', values: ['—', '—', 'Dedicated'] },
  { labelKey: 'acp.r.support', values: ['24/5', '24/5 Priority', '24/5 Priority'] },
]

// Comparison rows whose values are driven by the editable account-type config.
const CONFIG_ROW: Record<string, (c: AccountTypeConfig) => string> = {
  'acp.r.min': (c) => `$${c.minDeposit.toLocaleString()}`,
  'acp.r.spread': (c) => `${c.spreadFrom} pips`,
  'acp.r.comm': (c) => c.commission,
  'acp.r.lev': (c) => c.leverage,
}

const FAQ_IDS = ['f1', 'f2', 'f3']

export default function AccountsPage() {
  const t = useT()
  const { tiers, byName } = useAccountTypes()
  // Numeric/symbol values pass through; word values resolve via an acp.v.* key.
  const val = (v: string) => {
    const key = `acp.v.${v}`
    const r = t(key)
    return r === key ? v : r
  }
  const faqs = FAQ_IDS.map((id, i) => ({
    id,
    question: t(`acp.q${i + 1}`),
    answer: t(`acp.a${i + 1}`),
  }))
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Accounts']}
        title={t('acp.title')}
        description={t('acp.desc')}
      />

      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {tiers.map((tier) => (
            <AccountCard key={tier.name} tier={tier} />
          ))}
        </motion.div>
      </section>

      {/* Comparison table */}
      <section className="container-x py-10">
        <SectionHeading eyebrow={t('acp.compareEyebrow')} title={t('acp.compareTitle')} />
        <Reveal className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] overflow-hidden rounded-2xl border border-white/[0.06]">
            <thead>
              <tr className="bg-ink-800/60 text-left text-sm">
                <th scope="col" className="px-5 py-4 font-medium text-gray-400">{t('acp.feature')}</th>
                {tiers.map((tier) => (
                  <th key={tier.name} scope="col" className="px-5 py-4 font-semibold text-white">
                    {tier.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-sm">
              {comparison.map((row) => (
                <tr key={row.labelKey} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-gray-400">{t(row.labelKey)}</td>
                  {row.values.map((v, i) => {
                    const cfg = byName?.get(accountTiers[i].name)
                    const fn = CONFIG_ROW[row.labelKey]
                    return (
                      <td key={i} className="px-5 py-3.5 font-medium text-gray-200">
                        {val(cfg && fn ? fn(cfg) : v)}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="container-x py-12">
        <SectionHeading eyebrow={t('acp.faqEyebrow')} title={t('acp.faqTitle')} />
        <Reveal className="mx-auto mt-8 max-w-3xl">
          <Accordion items={faqs} />
        </Reveal>
      </section>

      <CTABand />
    </>
  )
}
