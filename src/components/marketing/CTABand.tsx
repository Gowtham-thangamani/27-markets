import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Reveal } from '@/components/Reveal'
import { MarketWave } from '@/components/three/MarketWave'
import { SignalFlow } from '@/components/marketing/SignalFlow'

export function CTABand() {
  return (
    <section className="container-x py-20">
      <Reveal>
        <div className="glass-panel relative overflow-hidden px-6 py-14 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-full opacity-40">
            <MarketWave />
          </div>
          <div className="pointer-events-none absolute inset-0 bg-radial-red opacity-60" />
          <SignalFlow className="opacity-40" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Ready to trade beyond limits?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-gray-400">
              Open a live account in minutes, or sharpen your strategy with a free demo. No hidden
              fees, no dealing desk.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link to="/register">
                <Button size="lg">Open Live Account</Button>
              </Link>
              <Link to="/demo">
                <Button variant="outline" size="lg">
                  Try Free Demo
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  )
}
