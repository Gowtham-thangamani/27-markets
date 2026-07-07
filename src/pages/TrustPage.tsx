import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Lock,
  Landmark,
  Scale,
  Eye,
  FileText,
  MessageSquareWarning,
  KeyRound,
  type LucideIcon,
} from 'lucide-react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { useT } from '@/i18n/LanguageContext'
import { staggerContainer, fadeUp } from '@/lib/motion'

const pillars: { icon: LucideIcon; tKey: string; bKey: string }[] = [
  { icon: Landmark, tKey: 'trp.p1t', bKey: 'trp.p1b' },
  { icon: Lock, tKey: 'trp.p2t', bKey: 'trp.p2b' },
  { icon: Eye, tKey: 'trp.p3t', bKey: 'trp.p3b' },
  { icon: KeyRound, tKey: 'trp.p4t', bKey: 'trp.p4b' },
]

export default function TrustPage() {
  const t = useT()
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Trust & Safety']}
        title={t('trp.title')}
        description={t('trp.desc')}
      />

      {/* Pillars */}
      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-5 sm:grid-cols-2"
        >
          {pillars.map((p) => (
            <motion.div key={p.tKey} variants={fadeUp} className="glass-panel card-lift flex gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <p.icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-white">{t(p.tKey)}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{t(p.bKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Regulatory status — truthful */}
      <section className="container-x py-6">
        <Reveal className="glass-panel border-l-2 border-brand-500/50 p-7">
          <div className="flex items-center gap-3">
            <Scale className="h-6 w-6 text-brand-400" />
            <h2 className="font-display text-xl font-semibold text-white">{t('trp.regTitle')}</h2>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">{t('trp.regBody')}</p>
        </Reveal>
      </section>

      {/* Risk + complaints */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow={t('trp.riskEyebrow')}
          title={t('trp.riskTitle')}
          description={t('trp.riskDesc')}
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
          <Reveal className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">{t('trp.rdTitle')}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{t('trp.rdBody')}</p>
            <Link
              to="/legal/risk-disclosure"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
            >
              {t('trp.rdLink')}
            </Link>
          </Reveal>
          <Reveal className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">{t('trp.cpTitle')}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">{t('trp.cpBody')}</p>
            <Link
              to="/contact"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
            >
              {t('trp.cpLink')}
            </Link>
          </Reveal>
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <span>{t('trp.foot')}</span>
        </div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
