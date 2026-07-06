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

const features: { icon: LucideIcon; title: string; description: string }[] = [
  { icon: Gauge, title: 'Ultra-fast execution', description: 'Sub-30ms order routing with deep liquidity and minimal slippage.' },
  { icon: LineChart, title: 'Advanced charting', description: 'Pro-grade charts, 80+ indicators, and multi-timeframe analysis.' },
  { icon: ShieldCheck, title: 'Secure by design', description: 'Encrypted sessions, 2FA, and biometric login on mobile.' },
  { icon: Bell, title: 'Real-time alerts', description: 'Price, margin, and news alerts pushed instantly to every device.' },
  { icon: Layers, title: 'One account, every device', description: 'Seamlessly switch between web, desktop, and mobile in real time.' },
  { icon: Globe, title: 'All markets', description: 'Forex, indices, commodities, shares, and crypto CFDs in one place.' },
]

export default function PlatformsPage() {
  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Platforms']}
        title="Trade on every platform"
        description="Access global markets from your browser, desktop, or phone — one 27 Markets account, perfectly in sync across all your devices."
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
                <Link to={isWeb ? '/register' : '/portal/downloads'} className="mt-4">
                  <Button variant={isWeb ? 'primary' : 'outline'} fullWidth className="gap-1.5">
                    {isWeb ? (
                      <>
                        <Globe className="h-4 w-4" /> Launch WebTrader
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download
                      </>
                    )}
                  </Button>
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* Feature highlights */}
      <section className="container-x py-10">
        <SectionHeading eyebrow="Built for traders" title="Everything you need to trade with confidence" />
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeUp} className="glass-panel flex flex-col p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-display text-base font-semibold text-white">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-white">{f.description}</p>
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
