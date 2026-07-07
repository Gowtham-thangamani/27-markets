import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { useT } from '@/i18n/LanguageContext'
import { cardStagger, cardReveal } from '@/lib/motion'

/**
 * Social-proof section. The quotes below are PLACEHOLDERS — replace with real,
 * consented client reviews (and wire the rating to an actual source such as
 * Trustpilot) before relying on them publicly.
 */
const REVIEWS = [
  { qKey: 'rev.q1', name: 'A. Rahman', rKey: 'rev.r1' },
  { qKey: 'rev.q2', name: 'M. Osei', rKey: 'rev.r2' },
  { qKey: 'rev.q3', name: 'L. Fernandes', rKey: 'rev.r3' },
]

function Stars({ n = 5 }: { n?: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < n ? 'fill-brand-500 text-brand-500' : 'text-gray-600'}`}
        />
      ))}
    </div>
  )
}

export function Testimonials() {
  const t = useT()
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow={t('rev.eyebrow')}
          title={t('rev.title')}
          description={t('rev.desc')}
        />

        <Reveal className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <div className="glass-panel flex items-center gap-3 px-5 py-3">
            <span className="font-display text-2xl font-bold text-white">4.8</span>
            <div>
              <Stars n={5} />
              <p className="mt-0.5 text-xs text-gray-400">{t('rev.rating')}</p>
            </div>
          </div>
        </Reveal>

        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-5 md:grid-cols-3"
        >
          {REVIEWS.map((r) => (
            <motion.figure
              key={r.name}
              variants={cardReveal}
              className="glass-panel card-lift flex h-full flex-col gap-4 p-6"
            >
              <Quote className="h-6 w-6 text-brand-500/60" />
              <blockquote className="flex-1 text-sm leading-relaxed text-gray-200">
                "{t(r.qKey)}"
              </blockquote>
              <figcaption className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div>
                  <div className="text-sm font-semibold text-white">{r.name}</div>
                  <div className="text-xs text-gray-400">{t(r.rKey)}</div>
                </div>
                <Stars n={5} />
              </figcaption>
            </motion.figure>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
