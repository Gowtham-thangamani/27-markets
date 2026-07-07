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
import { useT } from '@/i18n/LanguageContext'

export default function AboutPage() {
  const t = useT()
  return (
    <>
      <PageHeader breadcrumb={['Home', 'About Us']} title={t('abt.title')} />

      {/* Intro + dramatic visual */}
      <section className="container-x grid items-center gap-12 py-12 lg:grid-cols-2">
        <Reveal>
          <p className="section-eyebrow mb-3">{t('abt.storyEyebrow')}</p>
          <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {t('abt.storyTitle')}
          </h2>
          <p className="mt-4 leading-relaxed text-white">{t('abt.p1')}</p>
          <p className="mt-4 leading-relaxed text-white">{t('abt.p2')}</p>
          <Link to="/accounts" className="mt-7 inline-block">
            <Button>{t('abt.explore')}</Button>
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
            <motion.div key={v.titleKey} variants={fadeUp} className="glass-panel card-lift p-7">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <v.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">{t(v.titleKey)}</h3>
              <p className="mt-2 text-sm leading-relaxed text-white">{t(v.descKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* KPI strip */}
      <section className="container-x py-12">
        <div className="flex flex-wrap justify-center gap-4">
          {[
            { value: 100, suffix: '+', label: t('abt.k1') },
            { value: 0.0, decimals: 1, label: t('abt.k2') },
            { value: 30, prefix: '<', suffix: 'ms', label: t('abt.k3') },
            { value: 500, prefix: '1:', label: t('abt.k4') },
            { value: 24, suffix: '/5', label: t('abt.k5') },
          ].map((s) => (
            <StatCard
              key={s.label}
              {...s}
              className="w-[calc(50%-0.5rem)] md:w-[calc(33.333%-0.667rem)] lg:w-[calc(20%-0.8rem)]"
            />
          ))}
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
          {/* Left scrim so the headline stays legible regardless of the photo */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-900/85 via-ink-900/45 to-transparent" />

          {/* Text overlay */}
          <div className="absolute inset-0 flex items-center">
            <div className="container-x">
              <Reveal>
                <p className="section-eyebrow mb-3">{t('abt.trustEyebrow')}</p>
                <h2 className="max-w-xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {t('abt.trustTitle')}
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-white">{t('abt.trustDesc')}</p>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <CTABand />
    </>
  )
}
