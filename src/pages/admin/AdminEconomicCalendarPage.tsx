import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, Badge, Input, Select, Modal, SkeletonRows, ErrorState } from '@/components/ui'
import {
  economicCalendarApi,
  type EconomicEvent,
  type SaveEventInput,
  type EconomicImpact,
} from '@/lib/economicCalendarApi'
import { ApiError } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

const IMPACT_OPTIONS: { value: EconomicImpact; label: string }[] = [
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
]

const impactTone: Record<EconomicImpact, 'danger' | 'warning' | 'neutral'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'neutral',
}

const EMPTY: SaveEventInput = {
  title: '',
  country: '',
  currency: '',
  impact: 'MEDIUM',
  eventAt: '',
  actual: '',
  forecast: '',
  previous: '',
  enabled: true,
}

// <input type="datetime-local"> works in local time without a timezone; convert
// to/from ISO for the API.
function isoToLocalInput(iso: string): string {
  const d = new Date(iso)
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}
function localInputToIso(local: string): string {
  return local ? new Date(local).toISOString() : ''
}
function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function AdminEconomicCalendarPage() {
  const toast = useToast()
  const [rows, setRows] = useState<EconomicEvent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<EconomicEvent | null>(null)
  const [form, setForm] = useState<(SaveEventInput & { eventLocal: string }) | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await economicCalendarApi.adminList())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load events')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY, eventLocal: '' })
  }

  const openEdit = (row: EconomicEvent) => {
    setEditing(row)
    setForm({
      title: row.title,
      country: row.country,
      currency: row.currency,
      impact: row.impact,
      eventAt: row.eventAt,
      eventLocal: isoToLocalInput(row.eventAt),
      actual: row.actual ?? '',
      forecast: row.forecast ?? '',
      previous: row.previous ?? '',
      enabled: row.enabled,
    })
  }

  const close = () => {
    setForm(null)
    setEditing(null)
  }

  const patch = (partial: Partial<SaveEventInput & { eventLocal: string }>) =>
    setForm((f) => (f ? { ...f, ...partial } : f))

  const save = async () => {
    if (!form) return
    if (!form.title.trim() || !form.country.trim() || !form.currency.trim() || !form.eventLocal) {
      toast.error('Missing fields', 'Title, country, currency and date/time are required.')
      return
    }
    setSaving(true)
    try {
      const { eventLocal, ...rest } = form
      const payload: SaveEventInput = { ...rest, eventAt: localInputToIso(eventLocal) }
      if (editing) {
        await economicCalendarApi.update(editing.id, payload)
        toast.success('Saved', 'Event updated.')
      } else {
        await economicCalendarApi.create(payload)
        toast.success('Created', 'Event added.')
      }
      close()
      void load()
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (row: EconomicEvent) => {
    try {
      await economicCalendarApi.update(row.id, { enabled: !row.enabled })
      void load()
    } catch (e) {
      toast.error('Update failed', e instanceof ApiError ? e.message : 'Could not update')
    }
  }

  const remove = async (row: EconomicEvent) => {
    if (!window.confirm(`Delete “${row.title}”? This cannot be undone.`)) return
    try {
      await economicCalendarApi.remove(row.id)
      toast.success('Deleted', 'Event removed.')
      void load()
    } catch (e) {
      toast.error('Delete failed', e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title="Economic Calendar"
          subtitle="Manage the market-moving events shown on the public economic calendar."
        />
        <Button className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> New event
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No events yet — add your first.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">When</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Impact</th>
                <th className="px-4 py-3 font-medium">Event</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3.5 text-gray-300">{fmt(r.eventAt)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-gray-400">{r.country}</span>{' '}
                    <span className="font-medium text-white">{r.currency}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <Badge tone={impactTone[r.impact]}>{r.impact}</Badge>
                  </td>
                  <td className="px-4 py-3.5 text-white">{r.title}</td>
                  <td className="px-4 py-3.5">
                    <button type="button" onClick={() => toggleEnabled(r)} aria-label="Toggle visibility">
                      <Badge tone={r.enabled ? 'success' : 'neutral'}>
                        {r.enabled ? 'Visible' : 'Hidden'}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" className="gap-1" onClick={() => openEdit(r)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(r)}
                        className="gap-1 text-danger"
                        aria-label="Delete event"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!form} onClose={close} title={editing ? 'Edit event' : 'New event'}>
        {form && (
          <div className="grid gap-4">
            <Input
              label="Event title"
              value={form.title}
              onChange={(e) => patch({ title: e.target.value })}
              placeholder="Non-Farm Payrolls"
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Country"
                value={form.country}
                onChange={(e) => patch({ country: e.target.value.toUpperCase() })}
                placeholder="US"
              />
              <Input
                label="Currency"
                value={form.currency}
                onChange={(e) => patch({ currency: e.target.value.toUpperCase() })}
                placeholder="USD"
              />
              <Select
                label="Impact"
                options={IMPACT_OPTIONS}
                value={form.impact}
                onChange={(e) => patch({ impact: e.target.value as EconomicImpact })}
              />
            </div>
            <Input
              label="Date & time"
              type="datetime-local"
              value={form.eventLocal}
              onChange={(e) => patch({ eventLocal: e.target.value })}
            />
            <div className="grid gap-4 sm:grid-cols-3">
              <Input
                label="Actual"
                value={form.actual ?? ''}
                onChange={(e) => patch({ actual: e.target.value })}
                placeholder="—"
              />
              <Input
                label="Forecast"
                value={form.forecast ?? ''}
                onChange={(e) => patch({ forecast: e.target.value })}
                placeholder="180K"
              />
              <Input
                label="Previous"
                value={form.previous ?? ''}
                onChange={(e) => patch({ previous: e.target.value })}
                placeholder="206K"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.enabled ?? true}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Visible on the public calendar
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={close} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={save} disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Create'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}
