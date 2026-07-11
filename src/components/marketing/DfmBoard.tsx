import { useEffect, useState } from 'react'
import { siteContentApi } from '@/lib/siteContentApi'

const DFM_SYMBOLS = [
  { sym: 'EMAAR', name: 'Emaar Properties' },
  { sym: 'DEWA', name: 'Dubai Electricity & Water' },
  { sym: 'EMIRATESNBD', name: 'Emirates NBD' },
  { sym: 'DIB', name: 'Dubai Islamic Bank' },
  { sym: 'SALIK', name: 'Salik Company' },
]

/**
 * DFM (Dubai Financial Market) board.
 * Real-time DFM data is licensed — it can only be shown via an authorized DFM
 * vendor agreement. Until that feed is connected, this is a clearly-labeled
 * placeholder (no real-time prices are displayed without entitlement).
 * The symbol list is admin-managed; the static list above is the fallback/seed.
 */
export function DfmBoard() {
  const [symbols, setSymbols] = useState(DFM_SYMBOLS)

  useEffect(() => {
    let active = true
    siteContentApi
      .dfmSymbols()
      .then((rows) => {
        if (active && rows.length) setSymbols(rows.map((r) => ({ sym: r.symbol, name: r.name })))
      })
      .catch(() => {
        /* keep the static fallback */
      })
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="glass-panel p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-white">DFM · Dubai Financial Market</h3>
        <span className="shrink-0 rounded-md bg-warning/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-warning ring-1 ring-warning/30">
          Awaiting licensed feed
        </span>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-white">
        DFM real-time prices require an authorized vendor agreement. The symbols below are
        placeholders until the licensed feed is connected.
      </p>
      <ul className="divide-y divide-white/[0.04] text-sm">
        {symbols.map((r) => (
          <li key={r.sym} className="flex items-center justify-between py-2.5">
            <div className="min-w-0">
              <span className="font-medium text-white">{r.sym}</span>
              <span className="text-white"> · {r.name}</span>
            </div>
            <span className="tabular-nums text-gray-600">—</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
