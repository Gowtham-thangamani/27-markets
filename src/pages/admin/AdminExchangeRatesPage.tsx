import { useCallback, useEffect, useState } from 'react'
import { ArrowRightLeft, Plus, Save, Trash2 } from 'lucide-react'
import { Button, EmptyState, ErrorState, Input, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type ExchangeRate } from '@/lib/adminApi'

export default function AdminExchangeRatesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<ExchangeRate[]>([])
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [form, setForm] = useState({ base: '', quote: '', rate: '' })
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminApi.listExchangeRates()
      setRows(data)
      setEdits(Object.fromEntries(data.map((r) => [r.id, r.rate])))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load rates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can edit rates.' : (e as Error).message)

  const add = async () => {
    if (!form.base.trim() || !form.quote.trim() || !form.rate.trim()) return
    setAdding(true)
    try {
      await adminApi.createExchangeRate({ base: form.base.trim().toUpperCase(), quote: form.quote.trim().toUpperCase(), rate: form.rate.trim() })
      setForm({ base: '', quote: '', rate: '' })
      await load()
      toast.success('Rate added')
    } catch (e) {
      fail(e)
    } finally {
      setAdding(false)
    }
  }

  const saveRate = async (r: ExchangeRate) => {
    setBusy(r.id)
    try {
      await adminApi.updateExchangeRate(r.id, edits[r.id])
      await load()
      toast.success('Rate updated')
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (r: ExchangeRate) => {
    if (!window.confirm(`Delete ${r.base}/${r.quote}?`)) return
    setBusy(r.id)
    try {
      await adminApi.deleteExchangeRate(r.id)
      toast.success('Rate deleted')
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle title="Exchange Rates" subtitle="FX reference rates used across the platform." />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-24"><Input label="Base" value={form.base} onChange={(e) => setForm((f) => ({ ...f, base: e.target.value }))} placeholder="USD" /></div>
        <div className="w-24"><Input label="Quote" value={form.quote} onChange={(e) => setForm((f) => ({ ...f, quote: e.target.value }))} placeholder="EUR" /></div>
        <div className="w-32"><Input label="Rate" value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0.92" /></div>
        <Button onClick={add} loading={adding} disabled={!form.base || !form.quote || !form.rate} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ArrowRightLeft} title="No rates" description="Add a currency pair above." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <span className="w-28 font-medium text-white">{r.base} / {r.quote}</span>
              <div className="flex items-center gap-2">
                <div className="w-32">
                  <Input value={edits[r.id] ?? ''} onChange={(e) => setEdits((v) => ({ ...v, [r.id]: e.target.value }))} />
                </div>
                <Button size="sm" variant="outline" loading={busy === r.id} disabled={edits[r.id] === r.rate} onClick={() => saveRate(r)} className="gap-1">
                  <Save className="h-3.5 w-3.5" /> Save
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(r)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
