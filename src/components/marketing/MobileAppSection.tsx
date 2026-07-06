import { Fingerprint, Bell, Zap } from 'lucide-react'
import { SiApple, SiGoogleplay } from 'react-icons/si'
import { SectionHeading } from '@/components/SectionHeading'
import { Reveal } from '@/components/Reveal'

const IOS_URL = 'https://download.mql5.com/cdn/mobile/mt5/ios'
const ANDROID_URL = 'https://download.mql5.com/cdn/mobile/mt5/android'

const features = [
  { icon: Fingerprint, label: 'Biometric login' },
  { icon: Bell, label: 'Real-time price alerts' },
  { icon: Zap, label: 'One-tap order execution' },
]

function StoreBadge({
  href,
  brand,
  top,
  name,
}: {
  href: string
  brand: React.ReactNode
  top: string
  name: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 transition-colors hover:border-brand-500/40 hover:bg-white/[0.06]"
    >
      {brand}
      <span className="text-left leading-tight">
        <span className="block text-[10px] uppercase tracking-wide text-gray-400">{top}</span>
        <span className="block text-sm font-semibold text-white">{name}</span>
      </span>
    </a>
  )
}

function PhoneMock() {
  return (
    <div className="relative w-[260px]">
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[70%] w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/20 blur-3xl"
      />
      <div className="relative rounded-[2.5rem] border border-white/10 bg-ink-800 p-3 shadow-2xl shadow-black/50">
        <div className="overflow-hidden rounded-[2rem] bg-ink-900 pb-4">
          <div className="mx-auto mt-2 h-1.5 w-16 rounded-full bg-white/10" />
          <div className="flex items-center justify-between px-5 pt-4">
            <div>
              <div className="text-xs text-gray-400">BTC/USD</div>
              <div className="font-mono text-lg font-bold text-white">62,832.60</div>
            </div>
            <span className="rounded-md bg-success/15 px-2 py-0.5 font-mono text-xs font-semibold text-success">
              ▲ 0.20%
            </span>
          </div>
          <svg viewBox="0 0 260 120" className="mt-3 w-full" aria-hidden>
            <defs>
              <linearGradient id="phone-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#e11d2e" stopOpacity="0.35" />
                <stop offset="1" stopColor="#e11d2e" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0,92 L30,82 L60,88 L90,60 L120,70 L150,42 L180,54 L210,30 L240,38 L260,22 L260,120 L0,120 Z"
              fill="url(#phone-fill)"
            />
            <path
              d="M0,92 L30,82 L60,88 L90,60 L120,70 L150,42 L180,54 L210,30 L240,38 L260,22"
              fill="none"
              stroke="#ff2d40"
              strokeWidth="2"
            />
          </svg>
          <div className="grid grid-cols-2 gap-2 px-5 pt-2">
            <span className="rounded-lg bg-success/15 py-2 text-center text-sm font-semibold text-success">
              Buy
            </span>
            <span className="rounded-lg bg-danger/15 py-2 text-center text-sm font-semibold text-danger">
              Sell
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileAppSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-24">
      <div className="container-x grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Mobile trading"
            title="Trade anywhere with the app"
            description="The full 27 Markets experience in your pocket, powered by MetaTrader 5 — trade, manage positions, and get alerts on iOS and Android."
          />
          <ul className="mt-8 space-y-3">
            {features.map((f) => (
              <li key={f.label} className="flex items-center gap-3 text-sm text-gray-200">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <f.icon className="h-4 w-4" />
                </span>
                {f.label}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            <StoreBadge
              href={IOS_URL}
              brand={<SiApple className="h-6 w-6 text-white" />}
              top="Download on the"
              name="App Store"
            />
            <StoreBadge
              href={ANDROID_URL}
              brand={<SiGoogleplay className="h-5 w-5 text-white" />}
              top="Get it on"
              name="Google Play"
            />
          </div>
        </div>

        <Reveal className="flex justify-center">
          <PhoneMock />
        </Reveal>
      </div>
    </section>
  )
}
