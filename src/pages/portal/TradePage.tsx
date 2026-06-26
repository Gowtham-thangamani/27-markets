import { useCallback, useEffect, useMemo, useState } from 'react'
import { TrendingUp, LineChart } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Select, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { usePortalUI } from '@/layouts/PortalLayout'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { ApiError } from '@/lib/api'
import { tradingApi, type OrderSide, type Order, type Position } from '@/lib/tradingApi'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

const INSTRUMENTS = [
  { sym: 'BINANCE:BTCUSDT', label: 'BTC / USD' },
  { sym: 'BINANCE:ETHUSDT', label: 'ETH / USD' },
  { sym: 'OANDA:EUR_USD', label: 'EUR / USD' },
  { sym: 'OANDA:XAU_USD', label: 'Gold (XAU/USD)' },
  { sym: 'AAPL', label: 'Apple' },
  { sym: 'TSLA', label: 'Tesla' },
]
const symLabel = (s: string) => INSTRUMENTS.find((i) => i.sym === s)?.label ?? s
const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function TradePage() {
  const { accounts } = usePortalData()
  const { openNewAccount } = usePortalUI()
  const toast = useToast()
  const { quotes } = useLiveQuotes()
  const demoAccounts = useMemo(() => accounts.filter((a) => a.mode === 'Demo'), [accounts])

  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  const [accountId, setAccountId] = useState('')
  const [symbol, setSymbol] = useState(INSTRUMENTS[0].sym)
  const [side, setSide] = useState<OrderSide>('BUY')
  const [quantity, setQuantity] = useState('0.10')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [p, o] = await Promise.all([tradingApi.listPositions('OPEN'), tradingApi.listOrders()])
      setPositions(p)
      setOrders(o)
    } catch {
      /* shown via toast on actions */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])
  useEffect(() => {
    if (!accountId && demoAccounts[0]) setAccountId(demoAccounts[0].id)
  }, [demoAccounts, accountId])

  const place = async () => {
    const qty = Number(quantity)
    if (!accountId || !(qty > 0)) {
      toast.warning('Check the order', 'Pick a demo account and a positive quantity.')
      return
    }
    setBusy('place')
    try {
      await tradingApi.placeOrder({ accountId, symbol, side, quantity: qty })
      toast.success('Order filled', `${side} ${qty} ${symLabel(symbol)}`)
      await load()
    } catch (e) {
      toast.error('Order rejected', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const close = async (id: string) => {
    setBusy(id)
    try {
      const p = await tradingApi.closePosition(id)
      const pnl = Number(p.realizedPnl ?? 0)
      toast.success('Position closed', `Realized P&L ${pnl >= 0 ? '+' : ''}${fmtNum(pnl)} USD`)
      await load()
    } catch (e) {
      toast.error('Could not close', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  if (demoAccounts.length === 0) {
    return (
      <>
        <PageTitle title="Trade" subtitle="Place orders and manage positions." />
        <EmptyState
          icon={LineChart}
          title="Open a demo account to start trading"
          description="Simulated trading runs on demo accounts, filled at live market prices. Live trading unlocks once the MT5 venue is connected."
          action={<Button onClick={openNewAccount}>Open Demo Account</Button>}
        />
      </>
    )
  }

  const livePrice = quotes[symbol]?.price

  return (
    <>
      <PageTitle title="Trade" subtitle="Demo execution at live prices · MT5-ready." />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* Order ticket */}
        <div className="glass-panel h-fit p-5">
          <h2 className="font-display text-base font-semibold text-white">Order Ticket</h2>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSide('BUY')}
              className={cn('rounded-lg py-2 text-sm font-semibold transition', side === 'BUY' ? 'bg-success/20 text-success ring-1 ring-success/40' : 'bg-ink-800 text-gray-400')}
            >
              Buy / Long
            </button>
            <button
              type="button"
              onClick={() => setSide('SELL')}
              className={cn('rounded-lg py-2 text-sm font-semibold transition', side === 'SELL' ? 'bg-danger/20 text-danger ring-1 ring-danger/40' : 'bg-ink-800 text-gray-400')}
            >
              Sell / Short
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <Select
              label="Instrument"
              value={symbol}
              options={INSTRUMENTS.map((i) => ({ value: i.sym, label: i.label }))}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <Select
              label="Account (demo)"
              value={accountId}
              options={demoAccounts.map((a) => ({ value: a.id, label: `${a.number} · ${formatCurrency(a.balance)}` }))}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-ink-800/50 px-3 py-2 text-sm">
              <span className="text-gray-400">Market price</span>
              <span className="font-mono tabular-nums text-white">{livePrice ? fmtNum(livePrice) : '—'}</span>
            </div>
            <Button
              fullWidth
              loading={busy === 'place'}
              onClick={place}
              className={side === 'SELL' ? 'bg-danger hover:bg-danger/90' : undefined}
            >
              {side === 'BUY' ? 'Buy' : 'Sell'} {symLabel(symbol)}
            </Button>
          </div>
        </div>

        {/* Positions + orders */}
        <div className="space-y-4">
          <div className="glass-panel overflow-hidden p-0">
            <div className="flex items-center gap-2 border-b border-white/[0.06] p-5">
              <TrendingUp className="h-4 w-4 text-brand-400" />
              <h3 className="font-display text-base font-semibold text-white">Open Positions</h3>
            </div>
            {loading ? (
              <div className="p-5"><SkeletonRows rows={3} /></div>
            ) : positions.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No open positions.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3 font-medium">Instrument</th>
                      <th className="px-5 py-3 font-medium">Side</th>
                      <th className="px-5 py-3 text-right font-medium">Qty</th>
                      <th className="px-5 py-3 text-right font-medium">Entry</th>
                      <th className="px-5 py-3 text-right font-medium">Market</th>
                      <th className="px-5 py-3 text-right font-medium">P&L</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {positions.map((p) => {
                      const entry = Number(p.entryPrice)
                      const qty = Number(p.quantity)
                      const cur = quotes[p.symbol]?.price
                      const pnl = cur !== undefined ? (cur - entry) * qty * (p.side === 'BUY' ? 1 : -1) : undefined
                      const up = (pnl ?? 0) >= 0
                      return (
                        <tr key={p.id}>
                          <td className="px-5 py-3 text-white">{symLabel(p.symbol)}</td>
                          <td className="px-5 py-3">
                            <Badge tone={p.side === 'BUY' ? 'success' : 'danger'}>{p.side}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-300">{qty}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-300">{fmtNum(entry)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-white">{cur ? fmtNum(cur) : '—'}</td>
                          <td className={cn('px-5 py-3 text-right font-mono tabular-nums', pnl === undefined ? 'text-gray-500' : up ? 'text-success' : 'text-danger')}>
                            {pnl === undefined ? '—' : `${up ? '+' : ''}${fmtNum(pnl)}`}
                          </td>
                          <td className="px-5 py-3 text-right">
                            <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => close(p.id)}>
                              Close
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="glass-panel overflow-hidden p-0">
            <div className="border-b border-white/[0.06] p-5">
              <h3 className="font-display text-base font-semibold text-white">Order History</h3>
            </div>
            {orders.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-500">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3 font-medium">Instrument</th>
                      <th className="px-5 py-3 font-medium">Side</th>
                      <th className="px-5 py-3 text-right font-medium">Qty</th>
                      <th className="px-5 py-3 text-right font-medium">Fill</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {orders.slice(0, 12).map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-3 text-gray-200">{symLabel(o.symbol)}</td>
                        <td className="px-5 py-3">
                          <span className={o.side === 'BUY' ? 'text-success' : 'text-danger'}>{o.side}</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-300">{Number(o.quantity)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-white">{fmtNum(Number(o.price))}</td>
                        <td className="px-5 py-3"><Badge tone="success">{o.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
