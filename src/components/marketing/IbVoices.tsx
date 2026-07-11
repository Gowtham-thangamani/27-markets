import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cardReveal, cardStagger } from '@/lib/motion'
import { siteContentApi } from '@/lib/siteContentApi'

/**
 * IB testimonial cluster — gradient/initial avatars paired with speech-bubble
 * quotes (no stock photos bundled). Reads as a network of partner voices,
 * mirroring the reference "Grow Your Clients Network" panel.
 * Content is admin-managed; the static list below is the fallback/seed.
 */

interface Voice {
  initials: string
  name: string
  quote: string
}

const VOICES: Voice[] = [
  { initials: 'AR', name: 'Ahmed R.', quote: 'Highest rebate & commission.' },
  { initials: 'SK', name: 'Sara K.', quote: 'Instant deposit & withdrawal.' },
  { initials: 'LW', name: 'Liang W.', quote: 'Multi-tier IB rebate system.' },
  { initials: 'DM', name: 'Diego M.', quote: 'Fast & secure execution.' },
  { initials: 'JP', name: 'James P.', quote: 'Various funding options.' },
  { initials: 'RT', name: 'Ravi T.', quote: 'Low-latency pricing.' },
]

export function IbVoices() {
  const [voices, setVoices] = useState<Voice[]>(VOICES)

  useEffect(() => {
    let active = true
    siteContentApi
      .testimonials()
      .then((rows) => {
        if (active && rows.length)
          setVoices(rows.map((r) => ({ initials: r.initials, name: r.name, quote: r.quote })))
      })
      .catch(() => {
        /* keep the static fallback */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="relative">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-3/4 w-3/4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial-red opacity-40 blur-3xl"
      />
      <motion.div
        variants={cardStagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="relative grid gap-4 sm:grid-cols-2"
      >
        {voices.map((v, i) => (
          <motion.div
            key={v.name}
            variants={cardReveal}
            className={`flex items-center gap-3 ${i % 2 === 1 ? 'sm:mt-6' : ''}`}
          >
            <span
              aria-hidden
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 font-display text-base font-bold text-onaccent shadow-[0_8px_24px_-6px_rgba(225,29,46,0.6)] ring-2 ring-brand-500/30"
            >
              {v.initials}
            </span>
            <div className="glass-panel relative rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-sm font-semibold leading-snug text-white">“{v.quote}”</p>
              <p className="mt-0.5 text-xs text-gray-400">{v.name} · Introducing Broker</p>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
