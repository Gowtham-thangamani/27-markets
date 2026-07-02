import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { StatCard } from '@/components/StatCard'
import { CTABand } from '@/components/marketing/CTABand'
import { PageHeader } from '@/components/marketing/PageHeader'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { asset } from '@/lib/asset'
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
          <p className="mt-4 leading-relaxed text-white">
            27 Markets is a next-generation broker built on trust, transparency, and technology.
            Our mission is to empower traders and partners with the best trading conditions,
            innovative solutions, and unmatched support.
          </p>
          <p className="mt-4 leading-relaxed text-white">
            From institutional-grade liquidity to sub-30ms execution, every part of our
            infrastructure is engineered to give you an edge across global markets.
          </p>
          <Link to="/accounts" className="mt-7 inline-block">
            <Button>Explore Accounts</Button>
          </Link>
        </Reveal>

        <Reveal>
          <img
            src={asset('hero-platform-light.png')}
            alt="27 Markets trading platform on laptop and mobile"
            className="w-full select-none drop-shadow-[0_30px_90px_rgba(225,29,46,0.3)]"
          />
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
              <p className="mt-2 text-sm leading-relaxed text-white">{v.description}</p>
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

      {/* Institutional trust band */}
      <section className="relative my-8 overflow-hidden">
        <div className="relative mx-auto max-w-[1600px]">
          <img
            src={asset('building.png')}
            alt=""
            aria-hidden
            className="h-[340px] w-full object-cover object-top animate-[kenburns_20s_ease-in-out_infinite] sm:h-[420px] lg:h-[480px]"
          />
          {/* Moving red light sweep across the facade */}
          <span className="building-sweep" aria-hidden />
          {/* Vignette + fade to black so the red neon edges glow and it blends into the page */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(125% 100% at 55% 25%, transparent 28%, rgba(5,5,5,0.9) 100%)',
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-ink-900 via-ink-900/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-ink-900 to-transparent" />

          {/* Text overlay */}
          <div className="absolute inset-0 flex items-center">
            <div className="container-x">
              <Reveal>
                <p className="section-eyebrow mb-3">Trusted Worldwide</p>
                <h2 className="max-w-xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                  Engineered for performance and trust
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-white">
                  Segregated funds, transparent pricing, and a relentless focus on execution
                  quality.
                </p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <CTABand />
    </>
  )
}
