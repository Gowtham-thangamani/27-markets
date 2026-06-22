import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { LazyGlobe } from '@/components/three/Lazy3D'
import { partnerBenefits } from '@/mock/content'
import { fadeUp, staggerContainer } from '@/lib/motion'

export function PartnerSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="section-eyebrow mb-3">Partner With Apex</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Grow Together. <br />
              <span className="text-gradient-red">Succeed Together.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-gray-400">
              Our IB program is built for long-term success. Enjoy competitive rebates, powerful
              tools, and dedicated support to grow your business across global markets.
            </p>
          </Reveal>

          <motion.ul
            variants={staggerContainer}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.3 }}
            className="mt-7 grid gap-3 sm:grid-cols-2"
          >
            {partnerBenefits.map((b) => (
              <motion.li key={b.title} variants={fadeUp} className="flex items-center gap-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
                  <Check className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-medium text-gray-200">{b.title}</span>
              </motion.li>
            ))}
          </motion.ul>

          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-3">
            <Link to="/partnership">
              <Button>Become a Partner</Button>
            </Link>
            <Link to="/partnership">
              <Button variant="outline">Learn More</Button>
            </Link>
          </Reveal>
        </div>

        <Reveal className="relative">
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <LazyGlobe className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_0_80px_rgba(225,29,46,0.15)]" />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
