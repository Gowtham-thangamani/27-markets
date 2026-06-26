import { useMemo, useState } from 'react'
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Button } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { PriceChart } from '@/components/portal/PriceChart'
import { SymbolSparkline } from '@/components/portal/Sparkline'
import { statusTone } from '@/components/portal/statusTone'
import { usePortalUI } from '@/layouts/PortalLayout'
import { useAuth } from '@/context/AuthContext'
import { usePortalData } from '@/context/PortalDataContext'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { useCandles } from '@/lib/useCandles'
import { formatCurrency, formatDate } from '@/lib/format'
import { cn } from '@/lib/cn'

const LABELS: Record<string, string> = {
  'OANDA:EUR_USD': 'EUR / USD',
  'OANDA:XAU_USD': 'Gold',
  'BINANCE:BTCUSDT': 'Bitcoin',
  'BINANCE:ETHUSDT': 'Ethereum',
  AAPL: 'Apple',
  TSLA: 'Tesla',
}
const SHORT: Record<string, string> = {
  'OANDA:EUR_USD': 'EUR',
  'OANDA:XAU_USD': 'XAU',
  'BINANCE:BTCUSDT': 'BTC',
  'BINANCE:ETHUSDT': 'ETH',
  AAPL: 'AAPL',
  TSLA: 'TSLA',
}
const label = (s: string) => LABELS[s] ?? s
const short = (s: string) => SHORT[s] ?? s.slice(0, 3)
const fmt = (p?: number) => {
  if (p === undefined) return '—'
  const d = p >= 100 ? 2 : p >= 1 ? 4 : 6
  return p.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d })
}

const FEATURED = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'OANDA:EUR_USD', 'OANDA:XAU_USD']
const WATCH = ['BINANCE:BTCUSDT', 'BINANCE:ETHUSDT', 'OANDA:EUR_USD', 'OANDA:XAU_USD', 'AAPL', 'TSLA']

export default function DashboardPage() {
  const { user } = useAuth()
  const { openNewAccount } = usePortalUI()
  const { totals, transactions } = usePortalData()
  const { quotes, connected } = useLiveQuotes()
  const [selected, setSelected] = useState(FEATURED[0])
  const { candles } = useCandles(selected, 15)

  const stats = useMemo(() => {
    if (candles.length === 0) return null
    return {
      open: candles[0].open,
      high: Math.max(...candles.map((c) => c.high)),
      low: Math.min(...candles.map((c) => c.low)),
      close: candles[candles.length - 1].close,
      points: candles.length,
    }
  }, [candles])

  const q = quotes[selected]
  const last = q?.price ?? stats?.close
  const chg = q?.changePct
  const sentiment = Math.max(6, Math.min(94, 50 + (chg ?? 0) * 6))

  return (
    <>
      <PageTitle
        title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'Trader'}`}
        subtitle="Your balance and the markets, live."
        action={
          <Button onClick={openNewAccount} size="sm">
            Open New Account
          </Button>
        }
      />

      {/* ── Balance strip ── */}
      <div className="glass-panel grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:items-center">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Balance</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-brand-400">
            {formatCurrency(totals.balance)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Instruments</p>
          <div className="mt-2 flex -space-x-2">
            {WATCH.map((s) => (
              <span
                key={s}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-900 bg-ink-700 text-[9px] font-bold text-brand-300 ring-1 ring-brand-500/20"
              >
                {short(s).slice(0, 3)}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Equity</p>
          <p className="mt-1 font-display text-2xl font-bold tabular-nums text-white">
            {formatCurrency(totals.equity)}
          </p>
        </div>
        <div className="flex items-center gap-2 lg:justify-end">
          <Link to="/portal/funds">
            <Button className="gap-1.5">
              <ArrowDownToLine className="h-4 w-4" /> Deposit
            </Button>
          </Link>
          <Link to="/portal/funds">
            <Button variant="outline" className="gap-1.5">
              <ArrowUpFromLine className="h-4 w-4" /> Withdraw
            </Button>
          </Link>
        </div>
      </div>

      {/* ── 4 instrument cards ── */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURED.map((sym) => {
          const cq = quotes[sym]
          const up = (cq?.changePct ?? 0) >= 0
          return (
            <button
              key={sym}
              onClick={() => setSelected(sym)}
              className={cn(
                'glass-panel card-lift p-4 text-left transition',
                selected === sym && 'ring-1 ring-brand-500/40',
              )}
            >
              <div className="flex items-start justify-between">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/15 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/20">
                  {short(sym)}
                </span>
                <div className="h-8 w-24">
                  <SymbolSparkline symbol={sym} up={up} />
                </div>
              </div>
              <p className="mt-3 font-display text-xl font-bold tabular-nums text-white">{fmt(cq?.price)}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-sm text-gray-400">{label(sym)}</span>
                {cq?.changePct !== undefined && (
                  <span
                    className={cn(
                      'rounded-md px-1.5 py-0.5 font-mono text-xs font-medium tabular-nums',
                      up ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger',
                    )}
                  >
                    {up ? '▲' : '▼'} {Math.abs(cq.changePct).toFixed(2)}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* ── Chart + statistics + sentiment ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.7fr_1fr_1fr]">
        {/* Candlestick */}
        <div className="glass-panel p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/15 text-[10px] font-bold text-brand-300 ring-1 ring-brand-500/20">
                {short(selected)}
              </span>
              <h2 className="font-display text-base font-semibold text-white">{label(selected)} Price</h2>
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <span className={cn('h-2 w-2 rounded-full', connected ? 'animate-pulse bg-success' : 'bg-gray-600')} />
                {connected ? 'Live' : '…'}
              </span>
            </div>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="Select instrument"
              className="rounded-md border border-white/10 bg-ink-800 px-2 py-1 text-sm text-gray-200"
            >
              {WATCH.map((s) => (
                <option key={s} value={s}>{label(s)}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm sm:grid-cols-6">
            <Stat label="Last" value={fmt(last)} accent />
            <Stat label="Change" value={chg !== undefined ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'} tone={chg} />
            <Stat label="Open" value={fmt(stats?.open)} />
            <Stat label="High" value={fmt(stats?.high)} />
            <Stat label="Low" value={fmt(stats?.low)} />
            <Stat label="Close" value={fmt(stats?.close)} />
          </div>
          <div className="mt-4 h-64 w-full">
            {candles.length > 1 ? (
              <PriceChart candles={candles} className="h-full w-full" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                Building live candles… (streams in as ticks arrive)
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="glass-panel p-5">
          <h3 className="mb-3 font-display text-base font-semibold text-white">Price Statistics</h3>
          <dl className="divide-y divide-white/[0.05] text-sm">
            <Row k="Value in USD" v={fmt(last)} />
            <Row k="Price Change" v={chg !== undefined ? `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%` : '—'} tone={chg} />
            <Row k="Session Open" v={fmt(stats?.open)} />
            <Row k="Session High" v={fmt(stats?.high)} />
            <Row k="Session Low" v={fmt(stats?.low)} />
            <Row k="Last Close" v={fmt(stats?.close)} />
            <Row k="Data Points" v={stats ? String(stats.points) : '—'} />
          </dl>
        </div>

        {/* Sentiment (compliant replacement for the prediction meter) */}
        <div className="glass-panel flex flex-col p-5">
          <h3 className="font-display text-base font-semibold text-white">Market Sentiment</h3>
          <div className="mx-auto mt-2 w-full max-w-[220px]">
            <SentimentGauge value={sentiment} />
          </div>
          <ul className="mt-2 space-y-2 text-sm">
            <SentLine label="Bearish" range="0 – 40" active={sentiment < 40} tone="danger" />
            <SentLine label="Neutral" range="40 – 60" active={sentiment >= 40 && sentiment <= 60} tone="muted" />
            <SentLine label="Bullish" range="60 – 100" active={sentiment > 60} tone="success" />
          </ul>
          <p className="mt-3 text-[11px] leading-snug text-gray-600">
            Indicative sentiment from recent price action — not investment advice.
          </p>
        </div>
      </div>

      {/* ── Trading history + market value ── */}
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="glass-panel overflow-hidden p-0">
          <div className="border-b border-white/[0.06] p-5">
            <h3 className="font-display text-base font-semibold text-white">Transaction History</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {transactions.slice(0, 6).map((t) => (
                  <tr key={t.id}>
                    <td className="px-5 py-3 font-medium text-white">{t.kind}</td>
                    <td className="px-5 py-3 text-right tabular-nums text-white">{formatCurrency(t.amount)}</td>
                    <td className="px-5 py-3"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                    <td className="px-5 py-3 text-gray-400">{formatDate(t.date)}</td>
                  </tr>
                ))}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-gray-500">No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="glass-panel overflow-hidden p-0">
          <div className="border-b border-white/[0.06] p-5">
            <h3 className="font-display text-base font-semibold text-white">Market Value</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-3 font-medium">#</th>
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 text-right font-medium">Price</th>
                  <th className="px-5 py-3 text-right font-medium">Mkt Cap</th>
                  <th className="px-5 py-3 font-medium">Graph</th>
                  <th className="px-5 py-3 text-right font-medium">Volume</th>
                  <th className="px-5 py-3 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {WATCH.map((sym, i) => {
                  const mq = quotes[sym]
                  const up = (mq?.changePct ?? 0) >= 0
                  return (
                    <tr key={sym}>
                      <td className="px-5 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-5 py-3">
                        <span className="font-medium text-white">{label(sym)}</span>{' '}
                        <span className="text-xs text-gray-500">{short(sym)}</span>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-white">{fmt(mq?.price)}</td>
                      <td className="px-5 py-3 text-right text-gray-600">—</td>
                      <td className="px-5 py-3">
                        <div className="h-7 w-24"><SymbolSparkline symbol={sym} up={up} /></div>
                      </td>
                      <td className="px-5 py-3 text-right text-gray-600">—</td>
                      <td className="px-5 py-3 text-right">
                        {mq?.changePct !== undefined ? (
                          <span className={cn('font-mono tabular-nums', up ? 'text-success' : 'text-danger')}>
                            {up ? '▲' : '▼'} {Math.abs(mq.changePct).toFixed(2)}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="px-5 pb-4 pt-1 text-[11px] text-gray-600">
            Price · graph · change are live. Market cap & volume need a data provider that supplies them.
          </p>
        </div>
      </div>
    </>
  )
}

function Stat({ label, value, accent, tone }: { label: string; value: string; accent?: boolean; tone?: number }) {
  const color = tone !== undefined ? (tone >= 0 ? 'text-success' : 'text-danger') : accent ? 'text-brand-400' : 'text-white'
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className={cn('mt-0.5 font-mono text-sm font-semibold tabular-nums', color)}>{value}</p>
    </div>
  )
}

function Row({ k, v, tone }: { k: string; v: string; tone?: number }) {
  const color = tone !== undefined ? (tone >= 0 ? 'text-success' : 'text-danger') : 'text-white'
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-gray-400">{k}</dt>
      <dd className={cn('font-mono tabular-nums', color)}>{v}</dd>
    </div>
  )
}

function SentimentGauge({ value }: { value: number }) {
  const r = 80
  const cx = 100
  const cy = 100
  const len = Math.PI * r
  const filled = (value / 100) * len
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  return (
    <svg viewBox="0 0 200 116" className="w-full">
      <path d={path} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" strokeLinecap="round" />
      <path
        d={path}
        fill="none"
        stroke="#e11d2e"
        strokeWidth="12"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${len}`}
      />
      <text x="100" y="96" textAnchor="middle" className="fill-white font-display" fontSize="26" fontWeight="bold">
        {Math.round(value)}%
      </text>
    </svg>
  )
}

function SentLine({ label, range, active, tone }: { label: string; range: string; active: boolean; tone: 'danger' | 'success' | 'muted' }) {
  const dot = tone === 'danger' ? 'bg-danger' : tone === 'success' ? 'bg-success' : 'bg-gray-500'
  return (
    <li className={cn('flex items-center justify-between rounded-lg px-2 py-1.5', active && 'bg-white/[0.04]')}>
      <span className="flex items-center gap-2 text-gray-300">
        <span className={cn('h-2 w-2 rounded-full', dot)} /> {label}
      </span>
      <span className="text-xs text-gray-500">{range}</span>
    </li>
  )
}
