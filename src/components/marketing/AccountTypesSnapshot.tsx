import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui'
import { accountTiers } from '@/mock/content'
import { useT } from '@/i18n/LanguageContext'
import { cardStagger, cardReveal } from '@/lib/motion'
import { cn } from '@/lib/cn'

/** Maps each English feature string to its translation key. */
const FEATURE_KEY: Record<string, string> = {
  'Commission free': 'accts.f.commissionFree',
  'Access to all markets': 'accts.f.allMarkets',
  '24/5 customer support': 'accts.f.support',
  'Minimum deposit $50': 'accts.f.min',
  'Low raw spreads': 'accts.f.lowRaw',
  '$7 commission per lot': 'accts.f.commission7',
  '24/5 priority support': 'accts.f.priority',
  'Lowest raw spreads': 'accts.f.lowestRaw',
  'Custom commission': 'accts.f.customComm',
  'Personal account manager': 'accts.f.manager',
  'Priority withdrawals': 'accts.f.priorityW',
}

export function AccountTypesSnapshot() {
  const t = useT()
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x">
        <SectionHeading
          eyebrow={t('accts.eyebrow')}
          title={t('accts.title')}
          description={t('accts.desc')}
        />

        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {accountTiers.map((tier) => (
            <motion.div
              key={tier.name}
              variants={cardReveal}
              className={cn(
                'glass-panel card-lift relative flex flex-col p-6',
                tier.popular && 'ring-1 ring-brand-500/40'
              )}
            >
              {tier.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                  {t('accts.popular')}
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-white">{tier.name}</h3>
              <p className="mt-1 text-sm text-gray-400">
                {t(`accts.aud.${tier.name.replace(/\s/g, '')}`)}
              </p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold tabular-nums text-white">{tier.spread}</span>
                <span className="text-sm text-gray-400">{t('accts.spreadFrom')}</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {t('accts.lev')} {tier.leverage} · {t('accts.min')}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-200">
                    <Check className="h-4 w-4 shrink-0 text-brand-400" /> {FEATURE_KEY[f] ? t(FEATURE_KEY[f]) : f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-6 block">
                <Button variant={tier.popular ? 'primary' : 'outline'} fullWidth>
                  {t('accts.open')} {tier.name}
                </Button>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        <Reveal className="mt-8 text-center">
          <Link
            to="/conditions"
            className="inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
          >
            {t('accts.compare')} <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
