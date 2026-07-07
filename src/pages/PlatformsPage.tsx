import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Monitor,
  Smartphone,
  Globe,
  Gauge,
  LineChart,
  ShieldCheck,
  Bell,
  Layers,
  Download,
  type LucideIcon,
} from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { PageHeader } from '@/components/marketing/PageHeader'
import { CTABand } from '@/components/marketing/CTABand'
import { Badge, Button } from '@/components/ui'
import { staggerContainer, fadeUp } from '@/lib/motion'
import { downloads } from '@/mock/data'
import { useT } from '@/i18n/LanguageContext'

const iconMap: Record<string, LucideIcon> = {
  desktop: Monitor,
  mobile: Smartphone,
  web: Globe,
}

// Public-facing platform builds (exclude account documents).
const platforms = downloads.filter((d) => d.icon !== 'doc')

// First build of each type carries the anchor id (#web / #mobile / #desktop) so
// nav links can deep-scroll to it — without producing duplicate DOM ids.
const anchorFor: Record<string, string> = {}
for (const p of platforms) if (!(p.icon in anchorFor)) anchorFor[p.icon] = p.id

const features: { icon: LucideIcon; tKey: string; dKey: string }[] = [
  { icon: Gauge, tKey: 'pfp.f1t', dKey: 'pfp.f1d' },
  { icon: LineChart, tKey: 'pfp.f2t', dKey: 'pfp.f2d' },
  { icon: ShieldCheck, tKey: 'pfp.f3t', dKey: 'pfp.f3d' },
  { icon: Bell, tKey: 'pfp.f4t', dKey: 'pfp.f4d' },
  { icon: Layers, tKey: 'pfp.f5t', dKey: 'pfp.f5d' },
  { icon: Globe, tKey: 'pfp.f6t', dKey: 'pfp.f6d' },
]

export default function PlatformsPage() {
  const t = useT()
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Platforms']}
        title={t('pfp.title')}
        description={t('pfp.desc')}
      />

      {/* Platform builds */}
      <section className="container-x py-14">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:grid-cols-3"
        >
          {platforms.map((p) => {
            const Icon = iconMap[p.icon] ?? Globe
            const isWeb = p.icon === 'web'
            return (
              <motion.div key={p.id} id={anchorFor[p.icon] === p.id ? p.icon : undefined} variants={fadeUp} className="glass-panel card-lift flex scroll-mt-24 flex-col p-6">
                <div className="flex items-center justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                    <Icon className="h-6 w-6" />
                  </span>
                  <Badge tone="neutral">{p.version}</Badge>
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-white">{p.name}</h3>
                <p className="mt-1 flex-1 text-sm leading-relaxed text-white">{p.description}</p>
                <div className="mt-4 flex items-center justify-between text-xs text-white">
                  <span>{p.platform}</span>
                  <span>{p.size}</span>
                </div>
                {p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer noopener" className="mt-4 block">
                    <Button variant="outline" fullWidth className="gap-1.5">
                      <Download className="h-4 w-4" /> {t('common.download')}
                    </Button>
                  </a>
                ) : (
                  <Link to={isWeb ? '/register' : '/portal/downloads'} className="mt-4 block">
                    <Button variant={isWeb ? 'primary' : 'outline'} fullWidth className="gap-1.5">
                      {isWeb ? (
                        <>
                          <Globe className="h-4 w-4" /> {t('pfp.launch')}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" /> {t('common.download')}
                        </>
                      )}
                    </Button>
                  </Link>
                )}
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Feature highlights */}
      <section className="container-x py-10">
        <SectionHeading eyebrow={t('pfp.featEyebrow')} title={t('pfp.featTitle')} />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.tKey} variants={fadeUp} className="glass-panel flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-white">{t(f.tKey)}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white">{t(f.dKey)}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      <Reveal>
        <CTABand />
      </Reveal>
    </>
  )
}
