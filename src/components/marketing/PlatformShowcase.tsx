import { motion } from 'framer-motion'
import { Monitor, Globe, LineChart, Bell, Layers, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { asset } from '@/lib/asset'
import { cardStagger, cardReveal } from '@/lib/motion'
import { useT } from '@/i18n/LanguageContext'

const ACCESS = [
  { icon: Globe, tKey: 'platform.webT', bKey: 'platform.webB' },
  { icon: Monitor, tKey: 'platform.deskT', bKey: 'platform.deskB' },
]

const FEATURES = [
  { icon: LineChart, key: 'platform.feat1' },
  { icon: Layers, key: 'platform.feat2' },
  { icon: Bell, key: 'platform.feat3' },
]

export function PlatformShowcase() {
  const t = useT()
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow={t('platform.eyebrow')}
          title={t('platform.title')}
          description={t('platform.desc')}
        />

        <div className="mt-12 grid items-center gap-12 lg:grid-cols-2">
          {/* Device */}
          <Reveal>
            <div className="relative mx-auto max-w-lg">
              <div
                aria-hidden
                className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl"
              />
              <img
                src={asset('hero-platform.webp')}
                alt="27 Markets trading platform on desktop and mobile"
                className="relative w-full select-none"
              />
            </div>
          </Reveal>

          {/* Access tiles + features */}
          <div>
            <motion.div
              variants={cardStagger}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              className="grid gap-4 sm:grid-cols-2"
            >
              {ACCESS.map((a) => (
                <motion.div
                  key={a.tKey}
                  variants={cardReveal}
                  className="glass-panel card-lift flex flex-col gap-2 p-4"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <a.icon className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{t(a.tKey)}</h3>
                  <p className="text-xs leading-relaxed text-gray-400">{t(a.bKey)}</p>
                </motion.div>
              ))}
            </motion.div>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.key} className="flex items-center gap-3 text-sm text-gray-200">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <f.icon className="h-4 w-4" />
                  </span>
                  {t(f.key)}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo">
                <Button size="lg" className="gap-2">
                  {t('platform.launch')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/platforms">
                <Button variant="outline" size="lg">
                  {t('platform.all')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
