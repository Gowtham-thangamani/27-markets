import { motion } from 'framer-motion'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { PageHeader } from '@/components/marketing/PageHeader'
import { AccountCard } from '@/components/marketing/AccountCard'
import { CTABand } from '@/components/marketing/CTABand'
import { Accordion } from '@/components/ui'
import { staggerContainer } from '@/lib/motion'
import { accountTiers } from '@/mock/content'

const comparison = [
  { label: 'Minimum deposit', values: ['$100', '$200', '$5,000'] },
  { label: 'Spreads from', values: ['0.8 pips', '0.0 pips', '0.0 pips'] },
  { label: 'Commission', values: ['None', '$7 / lot', 'Custom'] },
  { label: 'Max leverage', values: ['1:500', '1:500', '1:500'] },
  { label: 'All markets access', values: ['Yes', 'Yes', 'Yes'] },
  { label: 'Account manager', values: ['—', '—', 'Dedicated'] },
  { label: 'Support', values: ['24/5', '24/5 Priority', '24/5 Priority'] },
]

const faqs = [
  {
    id: 'f1',
    question: 'How long does it take to open a live account?',
    answer:
      'Most live accounts are opened within minutes. After registration you complete a short KYC verification and can fund your account immediately.',
  },
  {
    id: 'f2',
    question: 'Can I switch account types later?',
    answer:
      'Yes. You can open additional accounts of any type at any time from the client portal, and transfer funds internally between them instantly.',
  },
  {
    id: 'f3',
    question: 'Is there a demo account available?',
    answer:
      'Absolutely. You can request a free demo account preloaded with virtual funds to practice your strategy in live market conditions.',
  },
]

export default function AccountsPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Accounts']}
        title="Choose the account that fits you"
        description="Transparent pricing across three account types — all with access to every market and up to 1:500 leverage."
      />

      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {accountTiers.map((tier) => (
            <AccountCard key={tier.name} tier={tier} />
          ))}
        </motion.div>
      </section>

      {/* Comparison table */}
      <section className="container-x py-10">
        <SectionHeading eyebrow="Compare" title="Account comparison" />
        <Reveal className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[640px] overflow-hidden rounded-2xl border border-white/[0.06]">
            <thead>
              <tr className="bg-ink-800/60 text-left text-sm">
                <th className="px-5 py-4 font-medium text-gray-400">Feature</th>
                {accountTiers.map((t) => (
                  <th key={t.name} className="px-5 py-4 font-semibold text-white">
                    {t.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-sm">
              {comparison.map((row) => (
                <tr key={row.label} className="hover:bg-white/[0.02]">
                  <td className="px-5 py-3.5 text-gray-400">{row.label}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="px-5 py-3.5 font-medium text-gray-200">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Reveal>
      </section>

      {/* FAQ */}
      <section className="container-x py-12">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />
        <Reveal className="mx-auto mt-8 max-w-3xl">
          <Accordion items={faqs} />
        </Reveal>
      </section>

      <CTABand />
    </>
  )
}
