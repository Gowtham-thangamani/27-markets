import { motion } from 'framer-motion'
import { Apple, Landmark, Bitcoin } from 'lucide-react'
import { Reveal } from '@/components/Reveal'
import { cardReveal, cardStagger } from '@/lib/motion'

/**
 * "Method of payment" section — a floating cluster of funding-method bubbles,
 * mirroring the reference broker layout. Brand logos are hand-authored inline
 * (colored wordmarks + geometric marks) so the panel is self-contained with no
 * external assets. Absolute cluster on lg+, a wrapped pill grid on small screens.
 */

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
  { brand: 'skrill', label: 'Skrill', top: '4%', left: '16%', size: 'md' },
  { brand: 'visa', label: 'Visa', top: '2%', left: '48%', size: 'lg' },
  { brand: 'perfectmoney', label: 'Perfect Money', top: '10%', left: '78%', size: 'sm' },
  { brand: 'googlepay', label: 'Google Pay', top: '30%', left: '6%', size: 'lg' },
  { brand: 'applepay', label: 'Apple Pay', top: '38%', left: '40%', size: 'xl' },
  { brand: 'banktransfer', label: 'Bank Transfer', top: '30%', left: '76%', size: 'md' },
  { brand: 'mastercard', label: 'Mastercard', top: '68%', left: '14%', size: 'lg' },
  { brand: 'neteller', label: 'Neteller', top: '60%', left: '52%', size: 'md' },
  { brand: 'crypto', label: 'Crypto', top: '54%', left: '86%', size: 'sm' },
  { brand: 'paypal', label: 'PayPal', top: '84%', left: '38%', size: 'md' },
  { brand: 'worldpay', label: 'WorldPay', top: '86%', left: '72%', size: 'sm' },
]

const SIZE: Record<Bubble['size'], string> = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
  xl: 'h-28 w-28',
}

const TEXT: Record<Bubble['size'], string> = {
  sm: 'text-[10px]',
  md: 'text-[11px]',
  lg: 'text-sm',
  xl: 'text-base',
}

/** Hand-authored, self-contained brand marks. */
function BrandLogo({ brand, size }: { brand: Brand; size: Bubble['size'] }) {
  const icon = size === 'xl' ? 'h-8 w-8' : size === 'lg' ? 'h-7 w-7' : 'h-6 w-6'
  switch (brand) {
    case 'visa':
      return (
        <span className="font-display font-black italic tracking-tight" style={{ color: '#1434CB' }}>
          VISA
        </span>
      )
    case 'mastercard':
      return (
        <svg viewBox="0 0 48 30" className={size === 'lg' ? 'h-8 w-12' : 'h-7 w-11'} aria-hidden>
          <circle cx="19" cy="15" r="11" fill="#EB001B" />
          <circle cx="29" cy="15" r="11" fill="#F79E1B" />
          <path d="M24 6.5a11 11 0 0 1 0 17 11 11 0 0 1 0-17z" fill="#FF5F00" />
        </svg>
      )
    case 'applepay':
      return (
        <span className="inline-flex items-center gap-0.5 font-semibold text-black">
          <Apple className={size === 'xl' ? 'h-6 w-6' : 'h-5 w-5'} fill="currentColor" strokeWidth={0} />
          Pay
        </span>
      )
    case 'googlepay':
      return (
        <span className="font-display font-bold tracking-tight">
          <span style={{ color: '#4285F4' }}>G</span>
          <span style={{ color: '#5F6368' }}> Pay</span>
        </span>
      )
    case 'paypal':
      return (
        <span className="font-display font-black italic tracking-tight">
          <span style={{ color: '#003087' }}>Pay</span>
          <span style={{ color: '#0070E0' }}>Pal</span>
        </span>
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
          <Landmark className={icon} />
          <span className="leading-tight">Bank</span>
        </span>
      )
    case 'crypto':
      return (
        <span className="inline-flex flex-col items-center gap-0.5 font-semibold" style={{ color: '#F7931A' }}>
          <Bitcoin className={icon} />
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
        </div>

        {/* Bubble cluster (lg+) */}
        <div className="relative hidden lg:block">
          {/* Soft framed background panel behind the cluster */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-[2rem] border border-black/[0.06] bg-gradient-to-br from-white/70 via-white/40 to-brand-500/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_30px_70px_-40px_rgba(0,0,0,0.35)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-2/3 w-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-radial-red opacity-30 blur-3xl"
          />
          <div className="relative mx-auto aspect-square w-full max-w-lg p-4">
            {BUBBLES.map((b, i) => (
              <div
                key={b.brand}
                title={b.label}
                className={`animate-float absolute flex items-center justify-center rounded-full border border-black/[0.06] bg-white p-2 text-center shadow-[0_14px_30px_-12px_rgba(0,0,0,0.4)] ring-1 ring-black/[0.03] ${SIZE[b.size]} ${TEXT[b.size]}`}
                style={{
                  top: b.top,
                  left: b.left,
                  animationDuration: `${6 + (i % 4)}s`,
                  animationDelay: `${(i % 5) * 0.4}s`,
                }}
              >
                <BrandLogo brand={b.brand} size={b.size} />
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
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-3.5 py-2 text-xs shadow-sm ring-1 ring-black/[0.03]"
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
