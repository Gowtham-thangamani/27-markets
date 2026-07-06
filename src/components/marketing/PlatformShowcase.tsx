import { motion } from 'framer-motion'
import { Monitor, Smartphone, Globe, LineChart, Bell, Layers, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { SectionHeading } from '@/components/SectionHeading'
import { asset } from '@/lib/asset'
import { cardStagger, cardReveal } from '@/lib/motion'

const ACCESS = [
  { icon: Globe, title: 'Web Trader', body: 'Trade instantly in your browser — nothing to install.' },
  { icon: Smartphone, title: 'Mobile', body: 'Full trading on iOS and Android, wherever you are.' },
  { icon: Monitor, title: 'Desktop', body: 'A focused desktop experience for serious sessions.' },
]

const FEATURES = [
  { icon: LineChart, label: 'Advanced charting & indicators' },
  { icon: Layers, label: 'Multiple order types & risk controls' },
  { icon: Bell, label: 'Real-time price alerts & watchlists' },
]

export function PlatformShowcase() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="container-x relative z-10">
        <SectionHeading
          eyebrow="Platforms"
          title="Trade your way — on every device"
          description="One account, synced across web, mobile, and desktop. Pick up exactly where you left off."
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
                src={asset('hero-platform.png')}
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
              className="grid gap-4 sm:grid-cols-3"
            >
              {ACCESS.map((a) => (
                <motion.div
                  key={a.title}
                  variants={cardReveal}
                  className="glass-panel card-lift flex flex-col gap-2 p-4"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <a.icon className="h-[18px] w-[18px]" />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{a.title}</h3>
                  <p className="text-xs leading-relaxed text-gray-400">{a.body}</p>
                </motion.div>
              ))}
            </motion.div>

            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f.label} className="flex items-center gap-3 text-sm text-gray-200">
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                    <f.icon className="h-4 w-4" />
                  </span>
                  {f.label}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/demo">
                <Button size="lg" className="gap-2">
                  Launch Web Trader <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/platforms">
                <Button variant="outline" size="lg">
                  See all platforms
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
