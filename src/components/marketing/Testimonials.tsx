import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Star, Quote } from 'lucide-react'
import { SectionHeading } from '@/components/SectionHeading'
import { useT } from '@/i18n/LanguageContext'
import { siteContentApi, type Testimonial } from '@/lib/siteContentApi'
import { cardStagger, cardReveal } from '@/lib/motion'

/**
 * Social-proof section. Reviews are admin-managed (siteContentApi.testimonials);
 * the static entries below are only a fallback shown until real, consented
 * reviews are published. No fabricated aggregate rating is displayed.
 */
const FALLBACK = [
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
  const [live, setLive] = useState<Testimonial[] | null>(null)

  useEffect(() => {
    let active = true
    siteContentApi
      .testimonials()
      .then((rows) => {
        if (active) setLive(rows.filter((r) => r.enabled !== false))
      })
      .catch(() => {
        if (active) setLive([])
      })
    return () => {
      active = false
    }
  }, [])

  // Prefer real admin-managed reviews; fall back to the static placeholders
  // until at least one is published.
  const cards =
    live && live.length > 0
      ? live.map((r) => ({ key: r.id, name: r.name, quote: r.quote, role: '' }))
      : FALLBACK.map((r) => ({ key: r.name, name: r.name, quote: t(r.qKey), role: t(r.rKey) }))

  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow={t('rev.eyebrow')}
          title={t('rev.title')}
          description={t('rev.desc')}
        />

        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 grid gap-5 md:grid-cols-3"
        >
          {cards.map((r) => (
            <motion.figure
              key={r.key}
              variants={cardReveal}
              className="glass-panel card-lift flex h-full flex-col gap-4 p-6"
            >
              <Quote className="h-6 w-6 text-brand-500/60" />
              <blockquote className="flex-1 text-sm leading-relaxed text-gray-200">
                "{r.quote}"
              </blockquote>
              <figcaption className="flex items-center justify-between border-t border-white/[0.06] pt-4">
                <div>
                  <div className="text-sm font-semibold text-white">{r.name}</div>
                  {r.role && <div className="text-xs text-gray-400">{r.role}</div>}
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
