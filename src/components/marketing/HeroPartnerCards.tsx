import { Wallet, Users, BadgeCheck } from 'lucide-react'

/** Partner/IB-themed floating cards around the growth-chart hero visual
 * (rebate earnings, active clients, next payout). True frosted-glass look —
 * translucent so the chart shows through — on-brand dark + red accent.
 * Decorative: pointer-events-none, lg-only. */
const glass =
  'rounded-2xl border border-white/20 bg-gradient-to-br from-white/[0.12] to-white/[0.03] ' +
  'backdrop-blur-2xl shadow-[0_16px_40px_-10px_rgba(0,0,0,0.55)] ring-1 ring-white/5'

export function HeroPartnerCards() {
  // Mini clients trend — last two bars carry the brand accent.
  const bars = [40, 52, 48, 74, 92]

  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
      {/* Monthly rebate — top-left */}
      <div
        className={`animate-float absolute left-[-7%] top-[5%] w-[200px] p-3.5 ${glass}`}
        style={{ animationDuration: '8s' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/20 text-brand-300">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-300">
              Monthly rebate
            </div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        </div>
        <div className="mt-2 font-mono text-xl font-bold tabular-nums text-white">+$4,820</div>
        <div className="mt-0.5 text-[11px] font-semibold text-success">▲ 18.2% vs last month</div>
      </div>

      {/* Active clients with mini bar chart — mid-right */}
      <div
        className={`animate-float absolute right-[-6%] top-[44%] w-[208px] p-3.5 ${glass}`}
        style={{ animationDuration: '10s', animationDelay: '0.8s' }}
      >
        <div className="flex items-end justify-between">
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-300">
              <Users className="h-3 w-3" /> Active clients
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">1,284</div>
            <div className="mt-0.5 text-[10px] font-semibold text-success">▲ 32 new this week</div>
          </div>
          <div className="flex h-12 items-end gap-1">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-2 rounded-sm ${i >= bars.length - 2 ? 'bg-brand-500' : 'bg-white/25'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Next payout — bottom-left */}
      <div
        className={`animate-float absolute left-[-3%] bottom-[6%] w-[196px] p-3.5 ${glass}`}
        style={{ animationDuration: '9s', animationDelay: '0.4s' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-onaccent shadow-[0_0_16px_rgba(225,29,46,0.6)]">
              <BadgeCheck className="h-4 w-4" />
            </span>
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-300">
              Next payout
            </div>
          </div>
        </div>
        <div className="mt-2 font-mono text-xl font-bold tabular-nums text-white">$6,140</div>
        <div className="mt-0.5 text-[11px] font-semibold text-gray-300">Friday · automatic</div>
      </div>
    </div>
  )
}
