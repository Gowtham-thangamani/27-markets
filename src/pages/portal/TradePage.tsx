import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, LineChart, Clock, SlidersHorizontal, RotateCcw, Pencil } from 'lucide-react'
import { Badge, Button, EmptyState, Input, Modal, Select, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { Mt5Card } from '@/components/portal/Mt5Card'
import { PriceChart } from '@/components/portal/PriceChart'
import { usePortalUI } from '@/layouts/PortalLayout'
import { usePortalData } from '@/context/PortalDataContext'
import { useToast } from '@/context/ToastContext'
import { useLiveQuotes } from '@/lib/useLiveQuotes'
import { useCandles } from '@/lib/useCandles'
import { ApiError } from '@/lib/api'
import { tradingApi, type OrderSide, type OrderType, type OrderStatus, type Order, type Position, type Margin } from '@/lib/tradingApi'
import { instruments } from '@/mock/data'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/cn'

const ORDER_TYPES: { value: OrderType; label: string }[] = [
  { value: 'MARKET', label: 'Market' },
  { value: 'LIMIT', label: 'Limit' },
  { value: 'STOP', label: 'Stop' },
]
const statusTone = (s: OrderStatus): 'success' | 'warning' | 'danger' | 'neutral' =>
  s === 'FILLED' ? 'success' : s === 'PENDING' ? 'warning' : s === 'REJECTED' ? 'danger' : 'neutral'

function Stat({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'up' | 'down' | 'neutral' }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-gray-500">{label}</div>
      <div className={cn('mt-0.5 font-mono text-sm font-medium tabular-nums', tone === 'up' ? 'text-success' : tone === 'down' ? 'text-danger' : 'text-white')}>
        {value}
      </div>
    </div>
  )
}

// Tradeable instruments = those with a live price feed (simulated execution
// fills at the live price). Derived from the shared instrument list so the
// terminal stays in sync with the public markets page.
const INSTRUMENTS = instruments
  .filter((i) => i.feed)
  .map((i) => ({ sym: i.feed as string, label: i.symbol, name: i.name }))
const symLabel = (s: string) => INSTRUMENTS.find((i) => i.sym === s)?.label ?? s
const isTradeable = (s: string | null): s is string => !!s && INSTRUMENTS.some((i) => i.sym === s)
const fmtNum = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export default function TradePage() {
  const { accounts } = usePortalData()
  const { openNewAccount } = usePortalUI()
  const toast = useToast()
  const { quotes } = useLiveQuotes()
  const [params] = useSearchParams()
  const urlSymbol = params.get('symbol')
  const demoAccounts = useMemo(() => accounts.filter((a) => a.mode === 'Demo'), [accounts])

  const [positions, setPositions] = useState<Position[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [margin, setMargin] = useState<Margin | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)

  // Detect server-side auto-closes (TP/SL/stop-out) between polls.
  const prevOpenIds = useRef<Set<string>>(new Set())
  const lastActionAt = useRef(0)

  const [accountId, setAccountId] = useState('')
  const [symbol, setSymbol] = useState(() => (isTradeable(urlSymbol) ? urlSymbol : INSTRUMENTS[0].sym))
  const [side, setSide] = useState<OrderSide>('BUY')
  const [quantity, setQuantity] = useState('0.10')
  const [orderType, setOrderType] = useState<OrderType>('MARKET')
  const [trigger, setTrigger] = useState('')

  // Manage-position modal (TP/SL + partial close)
  const [manageId, setManageId] = useState<string | null>(null)
  const [tp, setTp] = useState('')
  const [sl, setSl] = useState('')
  const [partial, setPartial] = useState('')

  // Edit pending order modal
  const [editId, setEditId] = useState<string | null>(null)
  const [editTrigger, setEditTrigger] = useState('')
  const [editQty, setEditQty] = useState('')

  const pendingOrders = useMemo(() => orders.filter((o) => o.status === 'PENDING'), [orders])
  const historyOrders = useMemo(() => orders.filter((o) => o.status !== 'PENDING'), [orders])
  const managePos = useMemo(() => positions.find((p) => p.id === manageId) ?? null, [positions, manageId])

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const [p, o] = await Promise.all([tradingApi.listPositions('OPEN'), tradingApi.listOrders()])
        // Detect positions auto-closed server-side (TP/SL/stop-out) since the last poll.
        const currentIds = new Set(p.map((x) => x.id))
        const gone = [...prevOpenIds.current].filter((id) => !currentIds.has(id))
        if (gone.length && Date.now() - lastActionAt.current > 2500) {
          toast.info(
            'Position closed',
            `${gone.length} position${gone.length > 1 ? 's were' : ' was'} auto-closed (take-profit, stop-loss, or stop-out). See order history.`,
          )
        }
        prevOpenIds.current = currentIds
        setPositions(p)
        setOrders(o)
        if (accountId) {
          try {
            setMargin(await tradingApi.margin(accountId))
          } catch {
            /* margin is best-effort */
          }
        }
      } catch {
        /* surfaced via toast on actions */
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [accountId, toast],
  )

  useEffect(() => {
    void load()
  }, [load])

  // Live refresh so auto-closes, fills, and P&L stay current.
  useEffect(() => {
    const id = window.setInterval(() => void load(true), 5000)
    return () => window.clearInterval(id)
  }, [load])

  useEffect(() => {
    if (!accountId && demoAccounts[0]) setAccountId(demoAccounts[0].id)
  }, [demoAccounts, accountId])

  // Follow the ?symbol= in the URL (e.g. arriving from a market card / preview).
  useEffect(() => {
    if (isTradeable(urlSymbol)) setSymbol(urlSymbol)
  }, [urlSymbol])

  // Live candles for the chart panel above the order ticket.
  const { candles } = useCandles(symbol, 15)

  const place = async () => {
    const qty = Number(quantity)
    const trig = Number(trigger)
    if (!accountId || !(qty > 0)) {
      toast.warning('Check the order', 'Pick a demo account and a positive quantity.')
      return
    }
    if (orderType !== 'MARKET' && !(trig > 0)) {
      toast.warning('Set a trigger price', `A ${orderType.toLowerCase()} order needs a trigger price.`)
      return
    }
    setBusy('place')
    try {
      const res = await tradingApi.placeOrder({
        accountId,
        symbol,
        side,
        quantity: qty,
        type: orderType,
        triggerPrice: orderType === 'MARKET' ? undefined : trig,
      })
      if ('status' in res && res.status === 'PENDING') {
        toast.success('Order placed', `${orderType} ${side} ${qty} ${symLabel(symbol)} @ ${fmtNum(trig)} — pending`)
      } else {
        toast.success('Order filled', `${side} ${qty} ${symLabel(symbol)}`)
      }
      await load()
    } catch (e) {
      toast.error('Order rejected', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const openManage = (p: Position) => {
    setManageId(p.id)
    setTp(p.takeProfit ? String(Number(p.takeProfit)) : '')
    setSl(p.stopLoss ? String(Number(p.stopLoss)) : '')
    setPartial(String(Number(p.quantity)))
  }

  const saveProtection = async () => {
    if (!manageId) return
    setBusy('protect')
    try {
      await tradingApi.setProtection(manageId, {
        takeProfit: tp ? Number(tp) : null,
        stopLoss: sl ? Number(sl) : null,
      })
      toast.success('Protection updated', 'Take-profit / stop-loss saved.')
      await load()
    } catch (e) {
      toast.error('Could not save', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const closeManaged = async () => {
    if (!manageId || !managePos) return
    const full = Number(managePos.quantity)
    const qty = Number(partial)
    const partialQty = qty > 0 && qty < full ? qty : undefined
    lastActionAt.current = Date.now()
    setBusy('closeManaged')
    try {
      const res = await tradingApi.closePosition(manageId, partialQty)
      const pnl = Number(res.realizedPnl ?? 0)
      toast.success(partialQty ? 'Partially closed' : 'Position closed', `Realized P&L ${pnl >= 0 ? '+' : ''}${fmtNum(pnl)} USD`)
      await load()
      if (!partialQty) setManageId(null)
    } catch (e) {
      toast.error('Could not close', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const cancel = async (id: string) => {
    setBusy(id)
    try {
      await tradingApi.cancelOrder(id)
      toast.success('Order cancelled', 'The pending order was cancelled.')
      await load()
    } catch (e) {
      toast.error('Could not cancel', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const openEdit = (o: Order) => {
    setEditId(o.id)
    setEditTrigger(o.triggerPrice ? String(Number(o.triggerPrice)) : '')
    setEditQty(String(Number(o.quantity)))
  }

  const saveEdit = async () => {
    if (!editId) return
    setBusy('edit')
    try {
      await tradingApi.modifyOrder(editId, {
        triggerPrice: editTrigger ? Number(editTrigger) : undefined,
        quantity: editQty ? Number(editQty) : undefined,
      })
      toast.success('Order updated', 'The pending order was modified.')
      await load()
      setEditId(null)
    } catch (e) {
      toast.error('Could not update', e instanceof ApiError ? e.message : (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const resetDemo = async () => {
    if (!accountId) return
    setBusy('reset')
    try {
      lastActionAt.current = Date.now()
      await tradingApi.resetDemo(accountId)
      toast.success('Demo reset', 'Positions closed and balance restored to $50,000.')
      await load()
    } catch (e) {
      toast.error('Could not reset', (e as Error).message)
    } finally {
      setBusy(null)
    }
  }

  const close = async (id: string) => {
    lastActionAt.current = Date.now()
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

  const liveQuote = quotes[symbol]
  const livePrice = liveQuote?.price
  const quoteFresh = !!liveQuote && !liveQuote.stale

  return (
    <>
      <PageTitle title="Trade" subtitle="Demo execution at live prices · MT5-ready." />
      <div className="mb-4">
        <Mt5Card />
      </div>

      {/* Live chart for the selected instrument */}
      <div className="glass-panel mb-4 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LineChart className="h-4 w-4 text-brand-400" />
            <h2 className="font-display text-base font-semibold text-white">{symLabel(symbol)}</h2>
          </div>
          <span className="font-mono text-sm tabular-nums text-white">{livePrice ? fmtNum(livePrice) : '—'}</span>
        </div>
        <div className="h-[300px] sm:h-[360px]">
          {candles.length > 1 ? (
            <PriceChart candles={candles} className="h-full w-full" />
          ) : quoteFresh ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Building live candles… (streams in as ticks arrive)
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
              <span className="rounded-full border border-white/10 px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                Indicative pricing
              </span>
              <p className="max-w-sm text-sm text-gray-500">
                A live chart for {symLabel(symbol)} appears once its market data feed is connected.
              </p>
            </div>
          )}
        </div>
      </div>

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
              options={INSTRUMENTS.map((i) => ({ value: i.sym, label: `${i.label} · ${i.name}` }))}
              onChange={(e) => setSymbol(e.target.value)}
            />
            <Select
              label="Account (demo)"
              value={accountId}
              options={demoAccounts.map((a) => ({ value: a.id, label: `${a.number} · ${formatCurrency(a.balance)}` }))}
              onChange={(e) => setAccountId(e.target.value)}
            />
            <div>
              <span className="mb-1.5 block text-sm font-medium text-gray-300">Order type</span>
              <div className="grid grid-cols-3 gap-2">
                {ORDER_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setOrderType(t.value)}
                    className={cn(
                      'rounded-lg py-2 text-xs font-semibold transition',
                      orderType === t.value ? 'bg-brand-500/20 text-brand-300 ring-1 ring-brand-500/40' : 'bg-ink-800 text-gray-400',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Quantity" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            {orderType !== 'MARKET' && (
              <Input
                label={`Trigger price (${orderType === 'LIMIT' ? 'limit' : 'stop'})`}
                type="number"
                value={trigger}
                placeholder={livePrice ? fmtNum(livePrice) : '0.00'}
                onChange={(e) => setTrigger(e.target.value)}
              />
            )}
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
              {orderType === 'MARKET'
                ? `${side === 'BUY' ? 'Buy' : 'Sell'} ${symLabel(symbol)}`
                : `Place ${orderType.toLowerCase()} order`}
            </Button>
          </div>
        </div>

        {/* Positions + orders */}
        <div className="space-y-4">
          {/* Account margin / equity */}
          <div className="glass-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-5">
                <Stat label="Equity" value={margin ? formatCurrency(margin.equity) : '—'} />
                <Stat label="Balance" value={margin ? formatCurrency(margin.balance) : '—'} />
                <Stat label="Free margin" value={margin ? formatCurrency(margin.free) : '—'} />
                <Stat
                  label="Margin level"
                  value={margin?.marginLevel != null ? `${fmtNum(margin.marginLevel)}%` : '—'}
                  tone={margin?.marginLevel == null ? 'neutral' : margin.marginLevel >= 100 ? 'up' : 'down'}
                />
                <Stat
                  label="Unrealized P&L"
                  value={margin ? `${margin.unrealized >= 0 ? '+' : ''}${fmtNum(margin.unrealized)}` : '—'}
                  tone={margin ? (margin.unrealized >= 0 ? 'up' : 'down') : 'neutral'}
                />
              </div>
              <Button size="sm" variant="outline" loading={busy === 'reset'} onClick={resetDemo}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset demo
              </Button>
            </div>
          </div>

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
                          <td className="px-5 py-3">
                            <div className="text-white">{symLabel(p.symbol)}</div>
                            {(p.takeProfit || p.stopLoss) && (
                              <div className="mt-0.5 text-[11px] tabular-nums text-gray-500">
                                {p.takeProfit && <span className="text-success">TP {fmtNum(Number(p.takeProfit))}</span>}
                                {p.takeProfit && p.stopLoss && ' · '}
                                {p.stopLoss && <span className="text-danger">SL {fmtNum(Number(p.stopLoss))}</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3">
                            <Badge tone={p.side === 'BUY' ? 'success' : 'danger'}>{p.side}</Badge>
                          </td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-300">{qty}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-gray-300">{fmtNum(entry)}</td>
                          <td className="px-5 py-3 text-right tabular-nums text-white">{cur ? fmtNum(cur) : '—'}</td>
                          <td className={cn('px-5 py-3 text-right font-mono tabular-nums', pnl === undefined ? 'text-gray-500' : up ? 'text-success' : 'text-danger')}>
                            {pnl === undefined ? '—' : `${up ? '+' : ''}${fmtNum(pnl)}`}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" variant="outline" aria-label="Manage position" onClick={() => openManage(p)}>
                                <SlidersHorizontal className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="outline" loading={busy === p.id} onClick={() => close(p.id)}>
                                Close
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {pendingOrders.length > 0 && (
            <div className="glass-panel overflow-hidden p-0">
              <div className="flex items-center gap-2 border-b border-white/[0.06] p-5">
                <Clock className="h-4 w-4 text-warning" />
                <h3 className="font-display text-base font-semibold text-white">Pending Orders</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-gray-500">
                      <th className="px-5 py-3 font-medium">Instrument</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 font-medium">Side</th>
                      <th className="px-5 py-3 text-right font-medium">Qty</th>
                      <th className="px-5 py-3 text-right font-medium">Trigger</th>
                      <th className="px-5 py-3 text-right font-medium">Market</th>
                      <th className="px-5 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {pendingOrders.map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-3 text-white">{symLabel(o.symbol)}</td>
                        <td className="px-5 py-3"><Badge tone="neutral">{o.type}</Badge></td>
                        <td className="px-5 py-3">
                          <span className={o.side === 'BUY' ? 'text-success' : 'text-danger'}>{o.side}</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-300">{Number(o.quantity)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-warning">{o.triggerPrice ? fmtNum(Number(o.triggerPrice)) : '—'}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-white">{quotes[o.symbol]?.price ? fmtNum(quotes[o.symbol].price) : '—'}</td>
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" aria-label="Edit order" onClick={() => openEdit(o)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="sm" variant="outline" loading={busy === o.id} onClick={() => cancel(o.id)}>
                              Cancel
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="glass-panel overflow-hidden p-0">
            <div className="border-b border-white/[0.06] p-5">
              <h3 className="font-display text-base font-semibold text-white">Order History</h3>
            </div>
            {historyOrders.length === 0 ? (
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
                    {historyOrders.slice(0, 12).map((o) => (
                      <tr key={o.id}>
                        <td className="px-5 py-3 text-gray-200">{symLabel(o.symbol)}</td>
                        <td className="px-5 py-3">
                          <span className={o.side === 'BUY' ? 'text-success' : 'text-danger'}>{o.side}</span>
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-gray-300">{Number(o.quantity)}</td>
                        <td className="px-5 py-3 text-right tabular-nums text-white">{fmtNum(Number(o.price))}</td>
                        <td className="px-5 py-3"><Badge tone={statusTone(o.status)}>{o.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {managePos && (
        <Modal
          open={!!manageId}
          onClose={() => setManageId(null)}
          title={`Manage ${symLabel(managePos.symbol)}`}
          description={`${managePos.side} ${Number(managePos.quantity)} @ ${fmtNum(Number(managePos.entryPrice))}`}
        >
          <div className="space-y-5">
            {(() => {
              const cur = quotes[managePos.symbol]?.price
              const entry = Number(managePos.entryPrice)
              const qty = Number(managePos.quantity)
              const upnl = cur != null ? (cur - entry) * qty * (managePos.side === 'BUY' ? 1 : -1) : undefined
              const realized = Number(managePos.realizedPnl ?? 0)
              return (
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-white/[0.06] bg-ink-800/40 p-3 text-center">
                  <div>
                    <div className="text-[11px] text-gray-500">Market</div>
                    <div className="font-mono text-sm text-white">{cur ? fmtNum(cur) : '—'}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Unrealized</div>
                    <div className={cn('font-mono text-sm', upnl === undefined ? 'text-gray-500' : upnl >= 0 ? 'text-success' : 'text-danger')}>
                      {upnl === undefined ? '—' : `${upnl >= 0 ? '+' : ''}${fmtNum(upnl)}`}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-gray-500">Realized</div>
                    <div className="font-mono text-sm text-white">{realized ? `${realized >= 0 ? '+' : ''}${fmtNum(realized)}` : '—'}</div>
                  </div>
                </div>
              )
            })()}

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white">Protection</h4>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Take profit" type="number" value={tp} placeholder="none" onChange={(e) => setTp(e.target.value)} />
                <Input label="Stop loss" type="number" value={sl} placeholder="none" onChange={(e) => setSl(e.target.value)} />
              </div>
              <Button className="mt-3" fullWidth variant="outline" loading={busy === 'protect'} onClick={saveProtection}>
                Save take-profit / stop-loss
              </Button>
            </div>

            <div className="h-px bg-white/[0.06]" />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-white">Close</h4>
              <Input
                label={`Quantity (max ${Number(managePos.quantity)})`}
                type="number"
                value={partial}
                onChange={(e) => setPartial(e.target.value)}
              />
              <Button className="mt-3" fullWidth loading={busy === 'closeManaged'} onClick={closeManaged}>
                {Number(partial) > 0 && Number(partial) < Number(managePos.quantity)
                  ? `Close ${Number(partial)} of ${Number(managePos.quantity)}`
                  : 'Close full position'}
              </Button>
            </div>

            <p className="text-center text-[11px] text-gray-500">
              Take-profit, stop-loss, and margin stop-out are enforced automatically against the live price.
            </p>
          </div>
        </Modal>
      )}

      {editId &&
        (() => {
          const o = orders.find((x) => x.id === editId)
          if (!o) return null
          return (
            <Modal
              open={!!editId}
              onClose={() => setEditId(null)}
              title={`Edit ${o.type.toLowerCase()} order`}
              description={`${o.side} ${symLabel(o.symbol)} · market ${quotes[o.symbol]?.price ? fmtNum(quotes[o.symbol].price) : '—'}`}
            >
              <div className="space-y-3">
                <Input label="Trigger price" type="number" value={editTrigger} onChange={(e) => setEditTrigger(e.target.value)} />
                <Input label="Quantity" type="number" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
                <Button className="mt-1" fullWidth loading={busy === 'edit'} onClick={saveEdit}>
                  Save changes
                </Button>
              </div>
            </Modal>
          )
        })()}
    </>
  )
}
