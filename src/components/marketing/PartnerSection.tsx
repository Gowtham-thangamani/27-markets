import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { partnerBenefits } from '@/mock/content'
import { fadeUp, staggerContainer } from '@/lib/motion'
import { asset } from '@/lib/asset'

export function PartnerSection() {
  return (
    <section className="relative overflow-hidden py-12 sm:py-16">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <Reveal>
            <p className="section-eyebrow mb-3">Partner With 27 Markets</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Grow Together. <br />
              <span className="text-gradient-red">Succeed Together.</span>
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-white">
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
          <div className="relative mx-auto w-full max-w-2xl lg:scale-110">
            <img
              src={asset('globe.png')}
              alt="27 Markets global trading network"
              className="globe-pulse w-full select-none"
            />
            <span
              className="globe-sweep"
              aria-hidden
              style={{
                WebkitMaskImage: `url(${asset('globe.png')})`,
                maskImage: `url(${asset('globe.png')})`,
              }}
            />
          </div>
        </Reveal>
      </div>
    </section>
  )
}
