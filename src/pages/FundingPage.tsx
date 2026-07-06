import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  CreditCard,
  Landmark,
  Wallet,
  Bitcoin,
  ArrowDownToLine,
  ArrowUpFromLine,
  DollarSign,
  ShieldCheck,
  Lock,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Button } from '@/components/ui'
import { staggerContainer, fadeUp, cardStagger, cardReveal } from '@/lib/motion'

const methods: { icon: LucideIcon; title: string; body: string; time: string }[] = [
  { icon: CreditCard, title: 'Cards', body: 'Visa & Mastercard debit and credit cards.', time: 'Instant' },
  { icon: Wallet, title: 'E-wallets', body: 'Skrill, Neteller and other popular wallets.', time: 'Instant' },
  { icon: Landmark, title: 'Bank transfer', body: 'Domestic and international bank wires.', time: '1–3 business days' },
  { icon: Bitcoin, title: 'Crypto', body: 'USDT and major cryptocurrencies.', time: 'On network confirm' },
]

const terms = [
  { icon: DollarSign, label: 'Minimum deposit', value: '$50' },
  { icon: ArrowDownToLine, label: 'Deposit fees', value: 'None from us*' },
  { icon: ArrowUpFromLine, label: 'Minimum withdrawal', value: 'No minimum' },
  { icon: DollarSign, label: 'Account currency', value: 'USD' },
]

const security = [
  { icon: ShieldCheck, label: 'PCI DSS Level 1' },
  { icon: Lock, label: '3-D Secure' },
  { icon: BadgeCheck, label: 'SSL encrypted' },
]

export default function FundingPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Funding']}
        title="Funding that respects your money"
        description="Fund your account securely from $50, and withdraw anytime with no minimum. Clear methods, clear timing, no surprise fees."
      />

      {/* Key terms */}
      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {terms.map((t) => (
            <motion.div key={t.label} variants={fadeUp} className="glass-panel flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <t.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-xl font-bold text-white">{t.value}</div>
                <div className="text-xs text-gray-400">{t.label}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Methods */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow="Payment methods"
          title="Fund your way"
          description="Choose the method that suits you. Timing depends on the provider — cards and e-wallets are typically instant."
        />
        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {methods.map((m) => (
            <motion.div key={m.title} variants={cardReveal} className="glass-panel card-lift flex flex-col gap-3 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-base font-semibold text-white">{m.title}</h3>
              <p className="flex-1 text-sm leading-relaxed text-gray-400">{m.body}</p>
              <span className="inline-flex w-max items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
                {m.time}
              </span>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-xs text-gray-500">
          *Third-party providers may apply their own fees. Any applicable charge is shown before you
          confirm a transaction.
        </p>
      </section>

      {/* Security + withdrawals */}
      <section className="container-x py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="glass-panel p-7">
            <h3 className="font-display text-xl font-semibold text-white">Withdrawals, without the friction</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              There is no minimum withdrawal. Request a payout anytime from your portal and we return
              funds to your original method as quickly as possible. Withdrawals are reviewed by our
              finance team before payout to keep your account secure.
            </p>
            <Link to="/register" className="mt-6 inline-block">
              <Button className="gap-2">
                Open an account <ArrowDownToLine className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
          <Reveal className="glass-panel p-7">
            <h3 className="font-display text-xl font-semibold text-white">Secure by design</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">
              Payments are processed over encrypted, PCI-compliant infrastructure. We never store your
              full card number — only the brand, last four digits, and expiry.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {security.map((s) => (
                <span
                  key={s.label}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-1.5 text-xs font-medium text-gray-300"
                >
                  <s.icon className="h-4 w-4 text-brand-400" /> {s.label}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
