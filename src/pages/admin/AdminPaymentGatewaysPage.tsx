import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { formatCurrency } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { adminApi, type PaymentGateway, type PaymentGatewayInput, type PaymentGatewayType } from '@/lib/adminApi'

const TYPES: PaymentGatewayType[] = ['BANK', 'CRYPTO', 'CARD', 'EWALLET']
const TYPE_TONE: Record<PaymentGatewayType, 'neutral' | 'brand' | 'info' | 'success'> = {
  BANK: 'neutral',
  CRYPTO: 'brand',
  CARD: 'info',
  EWALLET: 'success',
}

export default function AdminPaymentGatewaysPage() {
  const toast = useToast()
  const [rows, setRows] = useState<PaymentGateway[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<PaymentGateway | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listPaymentGateways())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load payment gateways')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage gateways.' : (e as Error).message)

  const toggle = async (g: PaymentGateway) => {
    setBusy(g.id)
    try {
      await adminApi.updatePaymentGateway(g.id, { enabled: !g.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (g: PaymentGateway) => {
    if (!window.confirm(`Delete the "${g.name}" gateway? This cannot be undone.`)) return
    setBusy(g.id)
    try {
      await adminApi.deletePaymentGateway(g.id)
      toast.success('Gateway deleted')
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <PageTitle title="Payment Gateways" subtitle="Deposit / withdrawal methods offered to clients." />
        <Button onClick={() => setEditing('new')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add gateway
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payment gateways" description="Add a gateway to let clients deposit." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((g) => (
            <div key={g.id} className="glass-panel flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-white">{g.name}</h3>
                    <Badge tone={TYPE_TONE[g.type]}>{g.type}</Badge>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Min {formatCurrency(g.minAmount)}{g.maxAmount != null ? ` · Max ${formatCurrency(g.maxAmount)}` : ' · No cap'}
                  </p>
                </div>
                <Badge tone={g.enabled ? 'success' : 'neutral'} dot>{g.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>

              {g.instructions && <p className="line-clamp-3 text-sm text-gray-400">{g.instructions}</p>}

              <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-3">
                <Button size="sm" variant="outline" loading={busy === g.id} onClick={() => toggle(g)}>
                  {g.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(g)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(g)} className="ml-auto gap-1 border-danger/40 text-danger hover:bg-danger/10">
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <GatewayModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => {
          setEditing(null)
          await load()
          toast.success(created ? 'Gateway added' : 'Gateway updated')
        }}
        onError={fail}
      />
    </>
  )
}

function GatewayModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: PaymentGateway | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const gateway = target && target !== 'new' ? target : null
  const [form, setForm] = useState<PaymentGatewayInput>({ name: '', type: 'BANK' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') {
      setForm({ name: '', type: 'BANK', enabled: true, instructions: '', minAmount: 50, maxAmount: null, sortOrder: 0 })
    } else if (target) {
      setForm({
        name: target.name,
        type: target.type,
        enabled: target.enabled,
        instructions: target.instructions ?? '',
        minAmount: target.minAmount,
        maxAmount: target.maxAmount,
        sortOrder: target.sortOrder,
      })
    }
  }, [target])

  if (!target) return null
  const set = <K extends keyof PaymentGatewayInput>(k: K, v: PaymentGatewayInput[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name.trim()) {
      onError(new Error('Name is required'))
      return
    }
    setSaving(true)
    try {
      if (isNew) await adminApi.createPaymentGateway(form)
      else if (gateway) await adminApi.updatePaymentGateway(gateway.id, form)
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add payment gateway' : `Edit ${gateway?.name}`} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Bank Transfer" />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Type</label>
          <select
            value={form.type}
            onChange={(e) => set('type', e.target.value as PaymentGatewayType)}
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Min deposit (USD)"
            type="number"
            value={String(form.minAmount ?? 0)}
            onChange={(e) => set('minAmount', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
          <Input
            label="Max deposit (USD, blank = none)"
            type="number"
            value={form.maxAmount == null ? '' : String(form.maxAmount)}
            onChange={(e) => set('maxAmount', e.target.value === '' ? null : Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
        </div>

        <Textarea label="Instructions (shown to client)" rows={3} value={form.instructions ?? ''} onChange={(e) => set('instructions', e.target.value)} />

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.enabled ?? true}
            onChange={(e) => set('enabled', e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
          />
          Enabled (visible to clients)
        </label>

        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add gateway' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
