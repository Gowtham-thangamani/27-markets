import { useCallback, useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { PageTitle } from '@/components/portal/PageTitle'
import { Button, Badge, Input, Select, Modal, SkeletonRows, ErrorState } from '@/components/ui'
import {
  instrumentsApi,
  type TradingInstrument,
  type SaveInstrumentInput,
  type InstrumentCategory,
} from '@/lib/instrumentsApi'
import { ApiError } from '@/lib/api'
import { useToast } from '@/context/ToastContext'

const CATEGORY_OPTIONS: { value: InstrumentCategory; label: string }[] = [
  { value: 'Forex', label: 'Forex' },
  { value: 'Metals', label: 'Metals' },
  { value: 'Indices', label: 'Indices' },
  { value: 'Commodities', label: 'Commodities' },
  { value: 'Stocks', label: 'Stocks' },
  { value: 'Crypto', label: 'Crypto' },
]

const EMPTY: SaveInstrumentInput = {
  symbol: '',
  name: '',
  category: 'Forex',
  feed: '',
  spread: 0,
  sortOrder: 0,
  enabled: true,
}

export default function AdminInstrumentsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<TradingInstrument[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<TradingInstrument | null>(null)
  const [form, setForm] = useState<SaveInstrumentInput | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setError(null)
    try {
      setRows(await instrumentsApi.adminList())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load instruments')
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setForm({ ...EMPTY })
  }

  const openEdit = (row: TradingInstrument) => {
    setEditing(row)
    setForm({
      symbol: row.symbol,
      name: row.name,
      category: row.category,
      feed: row.feed ?? '',
      spread: row.spread,
      sortOrder: row.sortOrder,
      enabled: row.enabled,
    })
  }

  const close = () => {
    setForm(null)
    setEditing(null)
  }

  const patch = (partial: Partial<SaveInstrumentInput>) =>
    setForm((f) => (f ? { ...f, ...partial } : f))

  const save = async () => {
    if (!form) return
    if (!form.symbol.trim() || !form.name.trim()) {
      toast.error('Missing fields', 'Symbol and name are required.')
      return
    }
    setSaving(true)
    try {
      const payload: SaveInstrumentInput = { ...form, feed: form.feed ?? '' }
      if (editing) {
        await instrumentsApi.update(editing.id, payload)
        toast.success('Saved', 'Instrument updated.')
      } else {
        await instrumentsApi.create(payload)
        toast.success('Created', 'Instrument added.')
      }
      close()
      void load()
    } catch (e) {
      toast.error('Save failed', e instanceof ApiError ? e.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  const toggleEnabled = async (row: TradingInstrument) => {
    try {
      await instrumentsApi.update(row.id, { enabled: !row.enabled })
      void load()
    } catch (e) {
      toast.error('Update failed', e instanceof ApiError ? e.message : 'Could not update')
    }
  }

  const remove = async (row: TradingInstrument) => {
    if (!window.confirm(`Delete “${row.symbol}”? This cannot be undone.`)) return
    try {
      await instrumentsApi.remove(row.id)
      toast.success('Deleted', 'Instrument removed.')
      void load()
    } catch (e) {
      toast.error('Delete failed', e instanceof ApiError ? e.message : 'Could not delete')
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageTitle
          title="Instruments"
          subtitle="Manage the tradeable instrument catalog. Instruments with a live feed are tradeable in the terminal."
        />
        <Button className="gap-1.5" onClick={openNew}>
          <Plus className="h-4 w-4" /> New instrument
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : !rows ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.06] bg-ink-800/40 p-10 text-center text-gray-400">
          No instruments yet — add your first.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06]">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-ink-800/60 text-left text-gray-400">
                <th className="px-4 py-3 font-medium">Symbol</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Feed</th>
                <th className="px-4 py-3 font-medium text-right">Spread</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3.5 font-medium text-white">{r.symbol}</td>
                  <td className="px-4 py-3.5 text-gray-300">{r.name}</td>
                  <td className="px-4 py-3.5 text-gray-400">{r.category}</td>
                  <td className="px-4 py-3.5">
                    {r.feed ? (
                      <span className="font-mono text-xs text-brand-400">{r.feed}</span>
                    ) : (
                      <span className="text-xs text-gray-600">no live feed</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono tabular-nums text-gray-300">
                    {r.spread}
                  </td>
                  <td className="px-4 py-3.5">
                    <button type="button" onClick={() => toggleEnabled(r)} aria-label="Toggle visibility">
                      <Badge tone={r.enabled ? 'success' : 'neutral'}>
                        {r.enabled ? 'Enabled' : 'Disabled'}
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
                        aria-label="Delete instrument"
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

      <Modal
        open={!!form}
        onClose={close}
        title={editing ? 'Edit instrument' : 'New instrument'}
        description="Set a provider feed (e.g. OANDA:EUR_USD, BINANCE:BTCUSDT) to make it tradeable with live prices; leave blank for a catalog-only listing."
      >
        {form && (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Symbol"
                value={form.symbol}
                onChange={(e) => patch({ symbol: e.target.value.toUpperCase() })}
                placeholder="EUR/USD"
              />
              <Select
                label="Category"
                options={CATEGORY_OPTIONS}
                value={form.category}
                onChange={(e) => patch({ category: e.target.value as InstrumentCategory })}
              />
            </div>
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Euro vs US Dollar"
            />
            <Input
              label="Feed symbol"
              value={form.feed ?? ''}
              onChange={(e) => patch({ feed: e.target.value })}
              placeholder="OANDA:EUR_USD (blank = no live feed)"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Spread"
                type="number"
                step="0.01"
                value={String(form.spread ?? 0)}
                onChange={(e) => patch({ spread: Number(e.target.value) || 0 })}
              />
              <Input
                label="Sort order"
                type="number"
                value={String(form.sortOrder ?? 0)}
                onChange={(e) => patch({ sortOrder: Number(e.target.value) || 0 })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={form.enabled ?? true}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-transparent"
              />
              Enabled (visible to clients)
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
