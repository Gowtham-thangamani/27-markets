import { motion } from 'framer-motion'
import { ShieldCheck, Lock, Landmark, ScrollText, Eye } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cardStagger, cardReveal } from '@/lib/motion'

/**
 * Trust / regulation / security band — placed directly under the hero.
 * Copy is deliberately truthful: 27 Markets is finalising authorization, so we
 * signal intent and safeguards without claiming a licence we don't yet hold.
 */
const PILLARS = [
  {
    icon: ShieldCheck,
    title: 'Segregated client funds',
    body: 'Client money is kept in accounts separate from company operating capital.',
  },
  {
    icon: Lock,
    title: 'Bank-grade security',
    body: 'Encrypted sessions and optional two-factor authentication on every account.',
  },
  {
    icon: Landmark,
    title: 'Authorization in progress',
    body: 'We are finalising our regulatory authorization and operate transparently in the meantime.',
  },
  {
    icon: Eye,
    title: 'Transparent pricing',
    body: 'The spread you see is the spread you trade — no hidden mark-ups or re-quotes.',
  },
]

export function TrustRegulationBand() {
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
              key={p.title}
              variants={cardReveal}
              className="glass-panel card-lift flex flex-col gap-3 p-5"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <p.icon className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-white">{p.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{p.body}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-3 text-xs leading-relaxed text-gray-400">
            <ScrollText className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
            <span>
              <span className="font-semibold text-gray-300">Risk warning:</span> Trading leveraged
              products such as CFDs carries a high risk of loss and may not be suitable for all
              investors. Ensure you understand the risks before trading.
            </span>
          </p>
          <Link
            to="/legal/risk-disclosure"
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand-400 transition-colors hover:text-brand-300"
          >
            Read Trust &amp; Safety →
          </Link>
        </div>
      </div>
    </section>
  )
}
