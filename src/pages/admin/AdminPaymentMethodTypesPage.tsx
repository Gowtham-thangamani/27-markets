import { useCallback, useEffect, useState } from 'react'
import { CreditCard, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type PaymentMethodType, type PaymentMethodCategory } from '@/lib/adminApi'

/** Shared page for Credit Card Types (CARD) and E-Wallet Types (EWALLET). */
export default function AdminPaymentMethodTypesPage({
  category,
  title,
  subtitle,
}: {
  category: PaymentMethodCategory
  title: string
  subtitle: string
}) {
  const toast = useToast()
  const [rows, setRows] = useState<PaymentMethodType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [adding, setAdding] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listPaymentMethodTypes(category))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [category])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage these.' : (e as Error).message)

  const add = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      await adminApi.createPaymentMethodType({ category, name: newName.trim() })
      setNewName('')
      await load()
      toast.success('Added')
    } catch (e) {
      fail(e)
    } finally {
      setAdding(false)
    }
  }

  const toggle = async (t: PaymentMethodType) => {
    setBusy(t.id)
    try {
      await adminApi.updatePaymentMethodType(t.id, { enabled: !t.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (t: PaymentMethodType) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return
    setBusy(t.id)
    try {
      await adminApi.deletePaymentMethodType(t.id)
      toast.success('Deleted')
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <PageTitle title={title} subtitle={subtitle} />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="w-full max-w-xs">
          <Input
            label={`Add ${title.replace(/ Types$/, '')}`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && add()}
            placeholder="Name"
          />
        </div>
        <Button onClick={add} loading={adding} disabled={!newName.trim()} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={CreditCard} title="Nothing yet" description="Add the first type above." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex items-center gap-3">
                <span className="font-medium text-white">{t.name}</span>
                <Badge tone={t.enabled ? 'success' : 'neutral'} dot>{t.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" loading={busy === t.id} onClick={() => toggle(t)}>
                  {t.enabled ? 'Disable' : 'Enable'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => remove(t)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10">
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
