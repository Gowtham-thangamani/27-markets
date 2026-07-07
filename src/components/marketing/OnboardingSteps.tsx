import { motion } from 'framer-motion'
import { UserPlus, BadgeCheck, Wallet, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { useT } from '@/i18n/LanguageContext'
import { cardStagger, cardReveal } from '@/lib/motion'

const STEPS = [
  { icon: UserPlus, tKey: 'steps.s1t', bKey: 'steps.s1b', timeKey: 'steps.s1time' },
  { icon: BadgeCheck, tKey: 'steps.s2t', bKey: 'steps.s2b', timeKey: 'steps.s2time' },
  { icon: Wallet, tKey: 'steps.s3t', bKey: 'steps.s3b', timeKey: 'steps.s3time' },
  { icon: TrendingUp, tKey: 'steps.s4t', bKey: 'steps.s4b', timeKey: 'steps.s4time' },
]

export function OnboardingSteps() {
  const t = useT()
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow={t('steps.eyebrow')}
          title={t('steps.title')}
          description={t('steps.desc')}
        />

        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
        >
          {STEPS.map((s, i) => (
            <motion.div
              key={s.tKey}
              variants={cardReveal}
              className="glass-panel card-lift relative flex flex-col gap-3 p-6"
            >
              <span className="absolute right-5 top-5 font-display text-3xl font-bold text-white/[0.06]">
                {i + 1}
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-white">{t(s.tKey)}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{t(s.bKey)}</p>
              <span className="mt-auto inline-flex w-max items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
                {t(s.timeKey)}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <Reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              {t('steps.cta1')} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/demo">
            <Button variant="outline" size="lg">
              {t('steps.cta2')}
            </Button>
          </Link>
        </Reveal>

        <p className="mt-4 text-center text-xs text-gray-500">{t('steps.foot')}</p>
      </div>
    </section>
  )
}
