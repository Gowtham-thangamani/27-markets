import { motion } from 'framer-motion'
import { Globe2, Coins } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { Parallax } from '@/components/Parallax'
import { IbVoices } from '@/components/marketing/IbVoices'
import { partnerBenefits } from '@/mock/content'
import { cardReveal, cardStagger } from '@/lib/motion'
import { asset } from '@/lib/asset'
import { useThemeSafe } from '@/context/ThemeContext'

export function PartnerSection() {
  const onLight = useThemeSafe() === 'light'
  return (
    <section className="section-alt relative overflow-hidden py-8 sm:py-12">
      <div className="container-x relative z-10">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <Reveal>
              <p className="section-eyebrow mb-3">Partner With 27 Markets</p>
              <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
                Grow Together. <br />
                <span className="text-white">Succeed Together.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-white">
                Our IB program is built for long-term success. Enjoy competitive rebates, powerful
                tools, and dedicated support to grow your business across global markets.
              </p>
            </Reveal>

            <Reveal delay={0.1} className="mt-7 flex flex-wrap gap-3">
              <Link to="/partnership">
                <Button>Become a Partner</Button>
              </Link>
              <Link to="/partnership">
                <Button variant="outline">Learn More</Button>
              </Link>
            </Reveal>
          </div>

          <Reveal className="relative">
            {onLight ? (
              /* Light theme: IB testimonial voices */
              <IbVoices />
            ) : (
              /* Dark theme: original floating globe */
              <>
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial-red opacity-60 blur-3xl"
                />
                <Parallax amount={45} className="relative mx-auto w-full max-w-2xl lg:scale-110">
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
                </Parallax>

                {/* Floating partner stat chips (foreground depth, mirrors the hero) */}
                <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
                  <div
                    className="glass-panel animate-float absolute left-0 top-[20%] flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/15"
                    style={{ animationDuration: '7s' }}
                  >
                    <Globe2 className="h-4 w-4 text-brand-400" />
                    <span className="font-semibold text-white">120+ Countries</span>
                  </div>
                  <div
                    className="glass-panel animate-float absolute bottom-[18%] right-[2%] flex items-center gap-2 rounded-xl px-3 py-2 text-xs shadow-[0_10px_30px_-8px_rgba(0,0,0,0.4)] ring-1 ring-brand-500/15"
                    style={{ animationDuration: '9s', animationDelay: '0.8s' }}
                  >
                    <Coins className="h-4 w-4 text-brand-400" />
                    <span className="font-semibold text-white">Instant Rebates</span>
                  </div>
                </div>
              </>
            )}
          </Reveal>
        </div>

        {/* Benefit cards — one row across, matching the partner-program layout */}
        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-10 flex flex-wrap justify-center gap-4"
        >
          {partnerBenefits.map((b) => (
            <motion.div
              key={b.title}
              variants={cardReveal}
              whileHover={{ y: -5 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22 }}
              className="glass-panel group flex w-[calc(50%-0.5rem)] flex-col items-start gap-3 p-5 transition-shadow duration-300 hover:border-brand-500/40 hover:shadow-[0_0_0_1px_rgba(225,29,46,0.3),0_16px_40px_rgba(0,0,0,0.45),0_0_36px_rgba(225,29,46,0.12)] sm:w-[calc(33.333%-0.667rem)] lg:w-[calc(20%-0.8rem)]"
            >
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 ring-1 ring-brand-500/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-brand-500 group-hover:text-onaccent group-hover:shadow-[0_0_24px_rgba(225,29,46,0.5)]">
                <b.icon className="h-5 w-5" />
              </span>
              <p className="font-display text-sm font-semibold leading-snug text-white">{b.title}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
