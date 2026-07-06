import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { Button } from '@/components/ui'
import { accountTiers } from '@/mock/content'
import { cardStagger, cardReveal } from '@/lib/motion'
import { cn } from '@/lib/cn'

export function AccountTypesSnapshot() {
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x">
        <SectionHeading
          eyebrow="Account types"
          title="An account for every trader"
          description="Start commission-free, or trade raw spreads with transparent commission. Upgrade anytime."
        />

        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 md:grid-cols-3"
        >
          {accountTiers.map((t) => (
            <motion.div
              key={t.name}
              variants={cardReveal}
              className={cn(
                'glass-panel card-lift relative flex flex-col p-6',
                t.popular && 'ring-1 ring-brand-500/40'
              )}
            >
              {t.popular && (
                <span className="absolute right-5 top-5 rounded-full bg-brand-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-300">
                  Popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold text-white">{t.name}</h3>
              <p className="mt-1 text-sm text-gray-400">{t.audience}</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-3xl font-bold tabular-nums text-white">{t.spread}</span>
                <span className="text-sm text-gray-400">pips spread from</span>
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Leverage up to {t.leverage} · $50 min deposit
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-200">
                    <Check className="h-4 w-4 shrink-0 text-brand-400" /> {f}
                  </li>
                ))}
              </ul>

              <Link to="/register" className="mt-6 block">
                <Button variant={t.popular ? 'primary' : 'outline'} fullWidth>
                  Open {t.name}
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
            Compare full trading conditions <ArrowRight className="h-4 w-4" />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
