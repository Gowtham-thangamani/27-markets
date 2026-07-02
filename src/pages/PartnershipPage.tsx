import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { StatCard } from '@/components/StatCard'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CTABand } from '@/components/marketing/CTABand'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { partnerBenefits } from '@/mock/content'

const steps = [
  { n: '01', title: 'Apply', text: 'Register as a partner and get approved within 24 hours.' },
  { n: '02', title: 'Refer', text: 'Share your unique link with traders and networks worldwide.' },
  { n: '03', title: 'Earn', text: 'Receive competitive rebates on every referred trade, paid reliably.' },
]

export default function PartnershipPage() {
  return (
    <>
      <PageHeader breadcrumb={['Home', 'Partnership']} title="Partner with 27 Markets" />

      {/* Hero with 27 Markets brand mark */}
      <section className="relative overflow-hidden">
        <div className="container-x relative py-10">
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <div className="mb-6 flex justify-center">
              <span className="relative inline-block">
                <img
                  src={asset('logo.png')}
                  alt="27 Markets"
                  className="globe-pulse block h-16 w-auto select-none sm:h-20"
                />
                {/* Light sheen that sweeps across the logo */}
                <span
                  className="infinity-sweep"
                  aria-hidden
                  style={{
                    WebkitMaskImage: `url(${asset('logo.png')})`,
                    maskImage: `url(${asset('logo.png')})`,
                  }}
                />
              </span>
            </div>
            <h2 className="font-display text-2xl font-bold leading-tight text-white sm:text-3xl">
              Powerful Partnership. <span className="text-white">Lasting Success.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-white">
              Join our IB program and unlock unlimited potential with industry-leading conditions
              and full transparency.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg">Become an IB Partner</Button>
              </Link>
              <Link to="/contact">
                <Button variant="outline" size="lg">
                  Learn More
                </Button>
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Benefits */}
      <section className="container-x py-14">
        <SectionHeading
          eyebrow="Why Partner"
          title="Everything you need to grow"
          description="A partnership built for long-term success, backed by real tools and real support."
        />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {partnerBenefits.map((b) => (
            <motion.div key={b.title} variants={fadeUp} className="glass-panel card-lift group p-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 transition-all group-hover:bg-brand-500 group-hover:text-onaccent">
                <b.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold text-white">{b.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white">{b.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* How it works */}
      <section className="container-x py-12">
        <SectionHeading eyebrow="How It Works" title="Start earning in three steps" />
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map((s) => (
            <Reveal key={s.n} className="glass-panel relative overflow-hidden p-7">
              <span className="font-display text-5xl font-bold text-brand-500">{s.n}</span>
              <h3 className="mt-2 font-display text-lg font-semibold text-white">{s.title}</h3>
              <p className="mt-2 text-sm text-white">{s.text}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Partner KPIs */}
      <section className="container-x py-12">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard value={45} suffix="%" label="Revenue share" />
          <StatCard value={120} suffix="+" label="Countries served" />
          <StatCard value={24} suffix="h" label="Approval time" />
          <StatCard value={5} prefix="$" suffix="M+" label="Rebates paid" />
        </div>
        <Reveal className="mt-10 text-center">
          <Link to="/register">
            <Button size="lg" className="gap-2">
              Become an IB Partner <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </Reveal>
      </section>

      <CTABand />
    </>
  )
}
