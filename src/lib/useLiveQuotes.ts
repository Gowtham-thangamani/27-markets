import { useEffect, useState } from 'react'
import { marketApi, type Quote } from './marketApi'

const BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'

/**
 * Subscribes to the backend's real-time market stream (SSE) with:
 *  - an initial REST snapshot,
 *  - automatic fallback to REST polling if SSE fails.
 * The backend owns the single upstream Finnhub connection + cache; this hook
 * just consumes the fan-out.
 */
export function useLiveQuotes(symbols?: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    let cancelled = false
    let es: EventSource | null = null
    let pollId: number | undefined
    let polling = false

    const merge = (list: Quote[]) =>
      setQuotes((prev) => {
        const next = { ...prev }
        for (const q of list) next[q.symbol] = q
        return next
      })

    const snapshot = () => marketApi.overview().then((l) => !cancelled && merge(l)).catch(() => {})

    const startPolling = () => {
      if (polling) return
      polling = true
      pollId = window.setInterval(snapshot, 5000)
    }

    void snapshot()

    try {
      es = new EventSource(`${BASE}/market/stream`, { withCredentials: true })
      es.onopen = () => setConnected(true)
      es.onmessage = (ev) => {
        try {
          const q = JSON.parse(ev.data) as Quote
          if (q && q.symbol) setQuotes((prev) => ({ ...prev, [q.symbol]: q }))
        } catch {
          /* ignore heartbeats / malformed frames */
        }
      }
      es.onerror = () => {
        setConnected(false)
        startPolling() // degrade to polling; EventSource also auto-retries
      }
    } catch {
      startPolling()
    }

    return () => {
      cancelled = true
      es?.close()
      if (pollId) window.clearInterval(pollId)
    }
  }, [])

  const list = symbols
    ? symbols.map((s) => quotes[s]).filter(Boolean)
    : Object.values(quotes)

  return { quotes, list, connected }
}
