import { motion } from 'framer-motion'
import { Landmark, ShieldCheck, Lock, BadgeCheck } from 'lucide-react'
import { SiVisa, SiPaypal, SiApplepay, SiGooglepay, SiBitcoin } from 'react-icons/si'
import { Reveal } from '@/components/Reveal'
import { asset } from '@/lib/asset'
import { cardReveal, cardStagger } from '@/lib/motion'

/**
 * "Method of payment" section — a floating cluster of funding-method bubbles.
 * Official brand marks come from react-icons where available (Visa, PayPal,
 * Apple Pay, Google Pay, Bitcoin); the rest are brand-coloured inline marks.
 * Absolute cluster on lg+, a wrapped pill grid on small screens.
 */

const TRUST = [
  { icon: ShieldCheck, label: 'PCI DSS Level 1' },
  { icon: Lock, label: '3-D Secure' },
  { icon: BadgeCheck, label: 'SSL Encrypted' },
]

type Brand =
  | 'visa'
  | 'mastercard'
  | 'applepay'
  | 'googlepay'
  | 'paypal'
  | 'skrill'
  | 'neteller'
  | 'perfectmoney'
  | 'worldpay'
  | 'banktransfer'
  | 'crypto'

interface Bubble {
  brand: Brand
  label: string
  /** Position within the square cluster (percent). */
  top: string
  left: string
  size: 'sm' | 'md' | 'lg' | 'xl'
}

const BUBBLES: Bubble[] = [
  { brand: 'skrill', label: 'Skrill', top: '2%', left: '14%', size: 'md' },
  { brand: 'visa', label: 'Visa', top: '1%', left: '45%', size: 'lg' },
  { brand: 'perfectmoney', label: 'Perfect Money', top: '9%', left: '74%', size: 'sm' },
  { brand: 'googlepay', label: 'Google Pay', top: '30%', left: '3%', size: 'lg' },
  { brand: 'applepay', label: 'Apple Pay', top: '37%', left: '38%', size: 'xl' },
  { brand: 'banktransfer', label: 'Bank Transfer', top: '28%', left: '74%', size: 'md' },
  { brand: 'mastercard', label: 'Mastercard', top: '66%', left: '11%', size: 'lg' },
  { brand: 'neteller', label: 'Neteller', top: '58%', left: '52%', size: 'md' },
  { brand: 'crypto', label: 'Crypto', top: '52%', left: '80%', size: 'sm' },
  { brand: 'paypal', label: 'PayPal', top: '82%', left: '40%', size: 'md' },
  { brand: 'worldpay', label: 'WorldPay', top: '82%', left: '70%', size: 'sm' },
]

const SIZE: Record<Bubble['size'], string> = {
  sm: 'h-20 w-20',
  md: 'h-24 w-24',
  lg: 'h-28 w-28',
  xl: 'h-32 w-32',
}

const TEXT: Record<Bubble['size'], string> = {
  sm: 'text-[11px]',
  md: 'text-xs',
  lg: 'text-sm',
  xl: 'text-lg',
}

const ICON_H: Record<Bubble['size'], string> = {
  sm: 'h-5',
  md: 'h-6',
  lg: 'h-7',
  xl: 'h-8',
}

/**
 * Real-logo overrides. Drop an official SVG/PNG into `public/payments/` and map
 * it here — e.g. `skrill: '/payments/skrill.svg'` — and it replaces the built-in
 * mark below. Empty entries fall through to the icon/wordmark, so no broken images.
 */
const LOGO_OVERRIDE: Partial<Record<Brand, string>> = {
  // visa: '/payments/visa.svg',
  // skrill: '/payments/skrill.svg',
  // neteller: '/payments/neteller.svg',
  // perfectmoney: '/payments/perfect-money.svg',
  // worldpay: '/payments/worldpay.svg',
}

/** Brand marks — official icons where available, brand-coloured fallbacks otherwise. */
function BrandLogo({ brand, size }: { brand: Brand; size: Bubble['size'] }) {
  const h = `${ICON_H[size]} w-auto`
  const override = LOGO_OVERRIDE[brand]
  if (override) {
    return <img src={asset(override)} alt={`${brand} payment method`} className={`${ICON_H[size]} w-auto object-contain`} />
  }
  switch (brand) {
    case 'visa':
      return <SiVisa className={h} style={{ color: '#1434CB' }} aria-hidden />
    case 'paypal':
      return <SiPaypal className={h} style={{ color: '#003087' }} aria-hidden />
    case 'applepay':
      return <SiApplepay className={h} style={{ color: '#000000' }} aria-hidden />
    case 'googlepay':
      return <SiGooglepay className={h} style={{ color: '#5F6368' }} aria-hidden />
    case 'crypto':
      return <SiBitcoin className={h} style={{ color: '#F7931A' }} aria-hidden />
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 30" className={size === 'lg' ? 'h-9 w-14' : 'h-8 w-12'} aria-hidden>
          <circle cx="19" cy="15" r="11" fill="#EB001B" />
          <circle cx="29" cy="15" r="11" fill="#F79E1B" />
          <path d="M24 6.5a11 11 0 0 1 0 17 11 11 0 0 1 0-17z" fill="#FF5F00" />
        </svg>
      )
    case 'skrill':
      return (
        <span className="font-display font-bold" style={{ color: '#862165' }}>
          Skrill
        </span>
      )
    case 'neteller':
      return (
        <span className="font-display font-bold uppercase tracking-tight" style={{ color: '#83BA3B' }}>
          Neteller
        </span>
      )
    case 'perfectmoney':
      return (
        <span className="font-display font-bold leading-tight">
          <span style={{ color: '#E4002B' }}>Perfect</span>
          <br />
          <span style={{ color: '#4B5563' }}>Money</span>
        </span>
      )
    case 'worldpay':
      return (
        <span className="font-display font-bold lowercase" style={{ color: '#E2001A' }}>
          worldpay
        </span>
      )
    case 'banktransfer':
      return (
        <span className="inline-flex flex-col items-center gap-0.5 font-semibold" style={{ color: '#334155' }}>
          <Landmark className={size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'} />
          <span className="leading-tight">Bank</span>
        </span>
      )
  }
}

export function PaymentsCluster() {
  return (
    <section className="section-alt relative overflow-hidden py-16 sm:py-20">
      <div className="container-x relative z-10 grid items-center gap-12 lg:grid-cols-2">
        {/* Copy */}
        <div>
          <Reveal>
            <p className="section-eyebrow mb-3">Funding &amp; Payments</p>
            <h2 className="font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
              Methods of payment, card types &amp; currencies accepted
            </h2>
            <p className="mt-4 max-w-md text-base leading-relaxed text-gray-300">
              Fund your account securely using major credit and debit cards, e-wallets, bank
              transfers, and crypto. All accounts are held in USD, with a minimum deposit of just
              $50 and no minimum withdrawal.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-6 flex flex-wrap gap-4 text-sm text-gray-400">
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> $50 minimum deposit
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> No minimum withdrawal
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" /> USD accounts
            </span>
          </Reveal>

          {/* Trust badges */}
          <Reveal delay={0.15} className="mt-8 flex flex-wrap items-center gap-2.5">
            {TRUST.map((t) => (
              <span
                key={t.label}
                className="inline-flex items-center gap-2 rounded-lg border border-black/[0.08] bg-black/[0.02] px-3 py-1.5 text-xs font-medium text-gray-400"
              >
                <t.icon className="h-4 w-4 text-brand-500" />
                {t.label}
              </span>
            ))}
          </Reveal>
        </div>

        {/* Bubble cluster (lg+) */}
        <div className="relative hidden lg:block">
          {/* Soft framed background panel behind the cluster */}
          <div
            aria-hidden
            className="absolute inset-0 overflow-hidden rounded-[2rem] border border-black/[0.06] bg-gradient-to-br from-[#ffffff]/80 via-[#f4f5f7]/60 to-brand-500/[0.05] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),0_30px_70px_-40px_rgba(0,0,0,0.35)]"
          >
            <div className="grid-bg absolute inset-0 opacity-[0.5]" />
          </div>
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial-red opacity-30 blur-3xl"
          />
          <div className="relative mx-auto aspect-square w-full max-w-xl p-4">
            {/* Orbit rings — network of payments */}
            <svg
              viewBox="0 0 100 100"
              className="pointer-events-none absolute inset-0 h-full w-full"
              fill="none"
              aria-hidden
            >
              {[47, 33, 19].map((r) => (
                <circle
                  key={r}
                  cx="50"
                  cy="50"
                  r={r}
                  stroke="#e11d2e"
                  strokeOpacity="0.14"
                  strokeWidth="0.35"
                  strokeDasharray="1.5 3"
                />
              ))}
            </svg>

            {BUBBLES.map((b, i) => (
              <div
                key={b.brand}
                className={`animate-float absolute ${SIZE[b.size]}`}
                style={{
                  top: b.top,
                  left: b.left,
                  animationDuration: `${6 + (i % 4)}s`,
                  animationDelay: `${(i % 5) * 0.4}s`,
                }}
              >
                <div
                  className={`group relative flex h-full w-full cursor-default items-center justify-center rounded-full border border-black/[0.06] bg-[#ffffff] p-2 text-center shadow-[0_14px_30px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.03] transition-all duration-300 hover:z-10 hover:-translate-y-1 hover:scale-110 hover:shadow-[0_22px_44px_-14px_rgba(225,29,46,0.4)] hover:ring-2 hover:ring-brand-500/40 ${TEXT[b.size]}`}
                >
                  <BrandLogo brand={b.brand} size={b.size} />
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#111827] px-2 py-1 text-[10px] font-medium text-[#ffffff] opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
                    {b.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pill grid (mobile) */}
        <motion.div
          variants={cardStagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="flex flex-wrap gap-2.5 lg:hidden"
        >
          {BUBBLES.map((b) => (
            <motion.span
              key={b.brand}
              variants={cardReveal}
              title={b.label}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-[#ffffff] px-3.5 py-2 text-xs shadow-sm ring-1 ring-black/[0.03]"
            >
              <BrandLogo brand={b.brand} size="sm" />
              <span className="sr-only">{b.label}</span>
            </motion.span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
