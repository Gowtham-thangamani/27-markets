import { useEffect, useState } from 'react'
import { instrumentsApi } from './instrumentsApi'
import { instruments as mockInstruments } from '@/mock/data'

/** A tradeable instrument = one with a live price feed (execution fills at the feed price). */
export interface TradeInstrument {
  sym: string
  label: string
  name: string
}

// Seed from the shared mock so the terminal renders instantly (and offline),
// then the backend catalog replaces it once loaded.
const seed: TradeInstrument[] = mockInstruments
  .filter((i) => i.feed)
  .map((i) => ({ sym: i.feed as string, label: i.symbol, name: i.name }))

/**
 * The tradeable-instrument list, sourced from the admin-managed backend catalog
 * (`/instruments`), falling back to the seed until it loads / if it fails.
 */
export function useTradeInstruments(): TradeInstrument[] {
  const [list, setList] = useState<TradeInstrument[]>(seed)

  useEffect(() => {
    let active = true
    instrumentsApi
      .list()
      .then((rows) => {
        const tradeable = rows
          .filter((r) => r.feed)
          .map((r) => ({ sym: r.feed as string, label: r.symbol, name: r.name }))
        if (active && tradeable.length) setList(tradeable)
      })
      .catch(() => {
        /* keep the seed */
      })
    return () => {
      active = false
    }
  }, [])

  return list
}
