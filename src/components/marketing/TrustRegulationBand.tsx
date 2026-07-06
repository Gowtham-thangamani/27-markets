import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Landmark, ScrollText, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cardStagger, cardReveal } from '@/lib/motion'
import { useT } from '@/i18n/LanguageContext'

/**
 * Trust / regulation / security band — placed directly under the hero.
 * Copy is deliberately truthful: 27 Markets is finalising authorization, so we
 * signal intent and safeguards without claiming a licence we don't yet hold.
 */
const PILLARS = [
  { icon: ShieldCheck, tKey: 'trustBand.p1t', bKey: 'trustBand.p1b' },
  { icon: Lock, tKey: 'trustBand.p2t', bKey: 'trustBand.p2b' },
  { icon: Landmark, tKey: 'trustBand.p3t', bKey: 'trustBand.p3b' },
  { icon: Eye, tKey: 'trustBand.p4t', bKey: 'trustBand.p4b' },
]

export function TrustRegulationBand() {
  const t = useT()
  return (
    <section className="border-y border-white/[0.06] bg-ink-850/40">
      <div className="container-x py-12 sm:py-14">
        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PILLARS.map((p) => (
            <motion.div
              key={p.tKey}
              variants={cardReveal}
              className="glass-panel card-lift flex flex-col gap-3 p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">{t(p.tKey)}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{t(p.bKey)}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-xs leading-relaxed text-gray-400">
            <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>{t('trustBand.risk')}</span>
          </p>
          <Link
            to="/legal/risk-disclosure"
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand-400 transition-colors hover:text-brand-300"
          >
            {t('trustBand.link')}
          </Link>
        </div>
      </div>
    </section>
  )
}
