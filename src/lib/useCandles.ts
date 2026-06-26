import { useEffect, useRef, useState } from 'react'
import { marketApi, type Candle } from './marketApi'

/**
 * Real OHLC candles for a symbol, aggregated server-side from the live tick
 * buffer. Polls so the chart stays fresh as new ticks arrive.
 */
export function useCandles(symbol: string, res = 60, pollMs = 8000) {
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(true)
  const symRef = useRef(symbol)
  symRef.current = symbol

  useEffect(() => {
    let active = true
    setLoading(true)
    const load = () =>
      marketApi
        .candles(symbol, res)
        .then((c) => active && symRef.current === symbol && setCandles(c))
        .catch(() => {})
        .finally(() => active && setLoading(false))
    void load()
    const id = window.setInterval(load, pollMs)
    return () => {
      active = false
      window.clearInterval(id)
    }
  }, [symbol, res, pollMs])

  return { candles, loading }
}
