import { Wallet, Users, BadgeCheck } from 'lucide-react'

/** Partner/IB-themed glass cards that float around the growth-chart hero visual
 * (rebate earnings, active clients, payout status) — same on-brand dark glass +
 * red accent as {@link HeroFloatingCards}. Decorative: pointer-events-none, lg-only. */
export function HeroPartnerCards() {
  // Mini clients trend — last two bars carry the brand accent.
  const bars = [40, 52, 48, 74, 92]

  return (
    <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
      {/* Monthly rebate — top-left */}
      <div
        className="glass-panel animate-float absolute left-[-7%] top-[7%] w-[200px] rounded-2xl p-3.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '8s' }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500/15 text-brand-400">
              <Wallet className="h-4 w-4" />
            </span>
            <div className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Monthly rebate
            </div>
          </div>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        </div>
        <div className="mt-2 font-mono text-xl font-bold tabular-nums text-white">+$4,820</div>
        <div className="mt-0.5 text-[11px] font-semibold text-success">▲ 18.2% vs last month</div>
      </div>

      {/* Active clients with mini bar chart — bottom-right */}
      <div
        className="glass-panel animate-float absolute right-[-6%] bottom-[18%] w-[208px] rounded-2xl p-3.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '10s', animationDelay: '0.8s' }}
      >
        <div className="flex items-end justify-between">
          <div className="leading-tight">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              <Users className="h-3 w-3" /> Active clients
            </div>
            <div className="mt-0.5 font-mono text-lg font-bold tabular-nums text-white">1,284</div>
            <div className="mt-0.5 text-[10px] font-semibold text-success">▲ 32 new this week</div>
          </div>
          <div className="flex h-12 items-end gap-1">
            {bars.map((h, i) => (
              <span
                key={i}
                className={`w-2 rounded-sm ${i >= bars.length - 2 ? 'bg-brand-500' : 'bg-white/15'}`}
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Payout status pill — bottom-left */}
      <div
        className="glass-panel animate-float absolute left-[-2%] bottom-[4%] flex items-center gap-2 rounded-full py-2 pl-2 pr-4 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.6)] ring-1 ring-brand-500/15"
        style={{ animationDuration: '9s', animationDelay: '0.4s' }}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-500 text-onaccent shadow-[0_0_16px_rgba(225,29,46,0.6)]">
          <BadgeCheck className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-medium text-white">Payouts every Friday</span>
      </div>
    </div>
  )
}
