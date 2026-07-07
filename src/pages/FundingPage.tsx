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
import { useT } from '@/i18n/LanguageContext'
import { staggerContainer, fadeUp, cardStagger, cardReveal } from '@/lib/motion'

const methods: { icon: LucideIcon; tKey: string; bKey: string; timeKey: string }[] = [
  { icon: CreditCard, tKey: 'fnd.m1t', bKey: 'fnd.m1b', timeKey: 'fnd.time.instant' },
  { icon: Wallet, tKey: 'fnd.m2t', bKey: 'fnd.m2b', timeKey: 'fnd.time.instant' },
  { icon: Landmark, tKey: 'fnd.m3t', bKey: 'fnd.m3b', timeKey: 'fnd.time.bank' },
  { icon: Bitcoin, tKey: 'fnd.m4t', bKey: 'fnd.m4b', timeKey: 'fnd.time.network' },
]

const terms: { icon: LucideIcon; labelKey: string; value: string; valueKey?: string }[] = [
  { icon: DollarSign, labelKey: 'fnd.t.min', value: '$50' },
  { icon: ArrowDownToLine, labelKey: 'fnd.t.fees', value: '', valueKey: 'fnd.v.noFees' },
  { icon: ArrowUpFromLine, labelKey: 'fnd.t.minW', value: '', valueKey: 'fnd.v.noMin' },
  { icon: DollarSign, labelKey: 'fnd.t.ccy', value: '', valueKey: 'fnd.v.usd' },
]

const security = [
  { icon: ShieldCheck, label: 'PCI DSS Level 1' },
  { icon: Lock, label: '3-D Secure' },
  { icon: BadgeCheck, label: 'SSL encrypted' },
]

export default function FundingPage() {
  const t = useT()
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Funding']}
        title={t('fnd.title')}
        description={t('fnd.desc')}
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
          {terms.map((item) => (
            <motion.div key={item.labelKey} variants={fadeUp} className="glass-panel flex items-center gap-3 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <item.icon className="h-5 w-5" />
              </span>
              <div>
                <div className="font-display text-xl font-bold text-white">
                  {item.valueKey ? t(item.valueKey) : item.value}
                </div>
                <div className="text-xs text-gray-400">{t(item.labelKey)}</div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Methods */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow={t('fnd.mEyebrow')}
          title={t('fnd.mTitle')}
          description={t('fnd.mDesc')}
        />
        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {methods.map((m) => (
            <motion.div key={m.tKey} variants={cardReveal} className="glass-panel card-lift flex flex-col gap-3 p-6">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <m.icon className="h-5 w-5" />
              </span>
              <h3 className="font-display text-base font-semibold text-white">{t(m.tKey)}</h3>
              <p className="flex-1 text-sm leading-relaxed text-gray-400">{t(m.bKey)}</p>
              <span className="inline-flex w-max items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
                {t(m.timeKey)}
              </span>
            </motion.div>
          ))}
        </motion.div>
        <p className="mt-6 text-center text-xs text-gray-500">{t('fnd.mFoot')}</p>
      </section>

      {/* Security + withdrawals */}
      <section className="container-x py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal className="glass-panel p-7">
            <h3 className="font-display text-xl font-semibold text-white">{t('fnd.wTitle')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{t('fnd.wBody')}</p>
            <Link to="/register" className="mt-6 inline-block">
              <Button className="gap-2">
                {t('fnd.wCta')} <ArrowDownToLine className="h-4 w-4" />
              </Button>
            </Link>
          </Reveal>
          <Reveal className="glass-panel p-7">
            <h3 className="font-display text-xl font-semibold text-white">{t('fnd.sTitle')}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-400">{t('fnd.sBody')}</p>
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
