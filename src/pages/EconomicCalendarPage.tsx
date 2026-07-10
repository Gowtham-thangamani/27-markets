import { useEffect, useMemo, useState } from 'react'
import { PageHeader } from '@/components/marketing/PageHeader'
import { Reveal } from '@/components/Reveal'
import { CTABand } from '@/components/marketing/CTABand'
import { Badge } from '@/components/ui'
import { economicCalendarApi, type EconomicEvent, type EconomicImpact } from '@/lib/economicCalendarApi'

const impactTone: Record<EconomicImpact, 'danger' | 'warning' | 'neutral'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
}

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState<EconomicEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    economicCalendarApi
      .list()
      .then((rows) => active && setEvents(rows))
      .catch(() => active && setEvents([]))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  // Group events by calendar day, preserving chronological order.
  const groups = useMemo(() => {
    const map = new Map<string, EconomicEvent[]>()
    for (const e of events) {
      const key = dayLabel(e.eventAt)
      const arr = map.get(key)
      if (arr) arr.push(e)
      else map.set(key, [e])
    }
    return [...map.entries()]
  }, [events])

  return (
    <>
      <PageHeader
        breadcrumb={['Home', 'Economic Calendar']}
        title="Economic Calendar"
        description="Upcoming market-moving events — central-bank decisions, inflation prints, and key data releases, with forecast and prior figures."
      />

      <section className="container-x py-14">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="glass-panel h-14 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="glass-panel p-10 text-center text-gray-400">
            No upcoming events are scheduled right now. Please check back soon.
          </div>
        ) : (
          <div className="space-y-10">
            {groups.map(([day, dayEvents]) => (
              <Reveal key={day}>
                <h2 className="mb-3 font-display text-lg font-semibold text-white">{day}</h2>
                <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-ink-800/60 text-left text-gray-400">
                        <th className="px-4 py-3 font-medium">Time</th>
                        <th className="px-4 py-3 font-medium">Currency</th>
                        <th className="px-4 py-3 font-medium">Impact</th>
                        <th className="px-4 py-3 font-medium">Event</th>
                        <th className="px-4 py-3 font-medium text-right">Actual</th>
                        <th className="px-4 py-3 font-medium text-right">Forecast</th>
                        <th className="px-4 py-3 font-medium text-right">Previous</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {dayEvents.map((e) => (
                        <tr key={e.id} className="hover:bg-white/[0.02]">
                          <td className="whitespace-nowrap px-4 py-3.5 font-mono tabular-nums text-gray-300">
                            {timeLabel(e.eventAt)}
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="text-gray-400">{e.country}</span>{' '}
                            <span className="font-medium text-white">{e.currency}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge tone={impactTone[e.impact]}>{e.impact}</Badge>
                          </td>
                          <td className="px-4 py-3.5 text-white">{e.title}</td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums text-brand-400">
                            {e.actual ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums text-gray-300">
                            {e.forecast ?? '—'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono tabular-nums text-gray-500">
                            {e.previous ?? '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <CTABand />
    </>
  )
}
