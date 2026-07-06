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
import { staggerContainer, fadeUp } from '@/lib/motion'

const pillars: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: Landmark,
    title: 'Segregated client funds',
    body: 'Client money is held in accounts kept separate from our operating capital, so your funds are never used to run the business.',
  },
  {
    icon: Lock,
    title: 'Bank-grade security',
    body: 'Encrypted sessions, optional two-factor authentication, and continuous monitoring protect every account around the clock.',
  },
  {
    icon: Eye,
    title: 'Transparent pricing',
    body: 'The spread you see is the spread you trade. No hidden mark-ups, no re-quotes, no conflict with your positions.',
  },
  {
    icon: KeyRound,
    title: 'Data protection',
    body: 'Your personal data is handled in line with our privacy and AML policies, and shared only where legally required.',
  },
]

export default function TrustPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Trust & Safety']}
        title="Your capital, safeguarded"
        description="Trust is earned through transparency. Here's exactly how we protect your funds, your data, and your trading — and where we stand on regulation."
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
            <motion.div key={p.title} variants={fadeUp} className="glass-panel card-lift flex gap-4 p-6">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <p.icon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="font-display text-base font-semibold text-white">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-gray-400">{p.body}</p>
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
            <h2 className="font-display text-xl font-semibold text-white">Regulatory status</h2>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-gray-300">
            27 Markets is finalising its regulatory authorization. Until that process is complete, the
            platform operates as a demonstration product and is not yet a live, licensed brokerage. We
            believe in stating this plainly rather than implying protections we do not yet hold. As our
            authorization progresses, this page will be updated with our licensed entity, jurisdiction,
            and registration details.
          </p>
        </Reveal>
      </section>

      {/* Risk + complaints */}
      <section className="container-x py-10">
        <SectionHeading
          eyebrow="Know the risks"
          title="Trading involves risk"
          description="Leveraged products can move quickly in both directions. Understanding the risks is part of trading responsibly."
        />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2">
          <Reveal className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Risk disclosure</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              Trading leveraged products such as CFDs carries a high risk of losing money rapidly and
              may not be suitable for all investors. Only trade with capital you can afford to lose.
            </p>
            <Link
              to="/legal/risk-disclosure"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
            >
              Read the full risk disclosure →
            </Link>
          </Reveal>
          <Reveal className="glass-panel p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Complaints &amp; support</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-gray-400">
              If something isn't right, we want to know. Reach our team and we'll work to resolve any
              issue fairly and promptly.
            </p>
            <Link
              to="/contact"
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-400 hover:text-brand-300"
            >
              Contact our team →
            </Link>
          </Reveal>
        </div>
        <div className="mx-auto mt-6 flex max-w-4xl items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-xs leading-relaxed text-gray-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
          <span>
            All fund-protection and regulatory statements on this page reflect our current status and
            are updated as our authorization progresses. Nothing here constitutes investment advice.
          </span>
        </div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
