import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { StatCard } from '@/components/StatCard'
import { CTABand } from '@/components/marketing/CTABand'
import { PageHeader } from '@/components/marketing/PageHeader'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { aboutValues } from '@/mock/content'

export default function AboutPage() {
  return (
    <>
      <PageHeader breadcrumb={['Home', 'About Us']} title="About 27 Markets" />

      {/* Intro + dramatic visual */}
      <section className="container-x grid items-center gap-12 py-12 lg:grid-cols-2">
        <Reveal>
          <p className="section-eyebrow mb-3">Our Story</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            A next-generation broker built on trust
          </h2>
          <p className="mt-4 leading-relaxed text-gray-400">
            27 Markets is a next-generation broker built on trust, transparency, and technology.
            Our mission is to empower traders and partners with the best trading conditions,
            innovative solutions, and unmatched support.
          </p>
          <p className="mt-4 leading-relaxed text-gray-400">
            From institutional-grade liquidity to sub-30ms execution, every part of our
            infrastructure is engineered to give you an edge across global markets.
          </p>
          <Link to="/accounts" className="mt-7 inline-block">
            <Button>Explore Accounts</Button>
          </Link>
        </Reveal>

        <Reveal>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-white/[0.06]">
            {/* Dramatic red architectural glow */}
            <div className="absolute inset-0 bg-ink-850" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(135deg, transparent 30%, rgba(225,29,46,0.25) 50%, transparent 70%), radial-gradient(circle at 70% 30%, rgba(225,29,46,0.3), transparent 50%)',
              }}
            />
            <div className="absolute inset-0 grid-bg opacity-40" />
            {/* Angular "architecture" shapes */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" fill="none">
              <path d="M200 40 L320 260 L80 260 Z" stroke="#e11d2e" strokeWidth="1.5" opacity="0.5" />
              <path d="M200 90 L280 260 L120 260 Z" stroke="#e11d2e" strokeWidth="1" opacity="0.3" />
              <path d="M200 40 L200 260" stroke="#ff5663" strokeWidth="1" opacity="0.4" />
            </svg>
            <div className="absolute inset-0 shadow-[inset_0_0_60px_rgba(225,29,46,0.2)]" />
          </div>
        </Reveal>
      </section>

      {/* Vision / Mission / Values */}
      <section className="container-x py-16">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-5 md:grid-cols-3"
        >
          {aboutValues.map((v) => (
            <motion.div key={v.title} variants={fadeUp} className="glass-panel card-lift p-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">{v.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">{v.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* KPI strip */}
      <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          <StatCard value={100} suffix="+" label="Trading instruments" />
          <StatCard value={0.0} decimals={1} label="Pips from spreads" />
          <StatCard value={30} prefix="<" suffix="ms" label="Execution speed" />
          <StatCard value={500} prefix="1:" label="Max leverage" />
          <StatCard value={24} suffix="/5" label="Customer support" />
        </div>
      </section>

      <SectionHeading
        className="py-8"
        eyebrow="Trusted Worldwide"
        title="Engineered for performance and trust"
        description="Segregated funds, transparent pricing, and a relentless focus on execution quality."
      />

      <CTABand />
    </>
  )
}
