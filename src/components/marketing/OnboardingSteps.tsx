import { motion } from 'framer-motion'
import { UserPlus, BadgeCheck, Wallet, TrendingUp, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'
import { cardStagger, cardReveal } from '@/lib/motion'

const STEPS = [
  { icon: UserPlus, title: 'Register', body: 'Create your account with just an email.', time: '~2 min' },
  { icon: BadgeCheck, title: 'Verify', body: 'Confirm your identity with a quick KYC check.', time: 'Same day' },
  { icon: Wallet, title: 'Fund', body: 'Deposit from $50 using your preferred method.', time: 'Instant*' },
  { icon: TrendingUp, title: 'Trade', body: 'Access 100+ markets on web, mobile, or desktop.', time: 'Go live' },
]

export function OnboardingSteps() {
  return (
    <section className="section-alt relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow="Getting started"
          title="Start trading in four simple steps"
          description="No paperwork maze, no waiting around. Open a live account in minutes — or try a free demo first."
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
              key={s.title}
              variants={cardReveal}
              className="glass-panel card-lift relative flex flex-col gap-3 p-6"
            >
              <span className="absolute right-5 top-5 font-display text-3xl font-bold text-white/[0.06]">
                {i + 1}
              </span>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/15">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="text-base font-semibold text-white">{s.title}</h3>
              <p className="text-sm leading-relaxed text-gray-400">{s.body}</p>
              <span className="mt-auto inline-flex w-max items-center rounded-full bg-brand-500/10 px-2.5 py-1 text-[11px] font-medium text-brand-300">
                {s.time}
              </span>
            </motion.div>
          ))}
        </motion.div>

        <Reveal className="mt-10 flex flex-wrap justify-center gap-3">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Open account in minutes <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link to="/demo">
            <Button variant="outline" size="lg">
              Try free demo
            </Button>
          </Link>
        </Reveal>

        <p className="mt-4 text-center text-xs text-gray-500">
          *Deposit timing depends on the funding method. Withdrawals have no minimum.
        </p>
      </div>
    </section>
  )
}
