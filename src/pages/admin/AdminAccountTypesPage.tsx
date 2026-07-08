import { useCallback, useEffect, useState } from 'react'
import { Pencil, Star } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type AccountTypeConfig, type AccountTypePatch } from '@/lib/adminApi'

export default function AdminAccountTypesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<AccountTypeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<AccountTypeConfig | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listAccountTypes())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load account types')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Account Types" subtitle="Trading conditions per account type. Editing is admin-only." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Star} title="No account types" description="Run the seed to create the default account types." />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((t) => (
            <div key={t.id} className="glass-panel flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{t.displayName}</h3>
                    {t.popular && (
                      <Badge tone="brand" dot>
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs uppercase tracking-wide text-gray-500">{t.type}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </Button>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Stat label="Spread from" value={`${t.spreadFrom} pips`} />
                <Stat label="Commission" value={t.commission} />
                <Stat label="Leverage" value={t.leverage} />
                <Stat label="Min deposit" value={`$${t.minDeposit.toLocaleString()}`} />
              </dl>
            </div>
          ))}
        </div>
      )}

      <EditAccountTypeModal
        config={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
          toast.success('Account type updated')
        }}
        onError={(msg) => toast.error('Update failed', msg)}
      />
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-white">{value}</dd>
    </div>
  )
}

function EditAccountTypeModal({
  config,
  onClose,
  onSaved,
  onError,
}: {
  config: AccountTypeConfig | null
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [form, setForm] = useState<AccountTypePatch>({})
  const [saving, setSaving] = useState(false)

  // Reset the form each time a different config is opened.
  useEffect(() => {
    if (config) {
      setForm({
        displayName: config.displayName,
        spreadFrom: config.spreadFrom,
        commission: config.commission,
        leverage: config.leverage,
        minDeposit: config.minDeposit,
        popular: config.popular,
        sortOrder: config.sortOrder,
      })
    }
  }, [config])

  if (!config) return null
  const set = <K extends keyof AccountTypePatch>(k: K, v: AccountTypePatch[K]) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      await adminApi.updateAccountType(config.type, form)
      onSaved()
    } catch (e) {
      const msg = e instanceof ApiError && e.status === 403 ? 'Only admins can edit account types.' : (e as Error).message
      onError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!config} onClose={onClose} title={`Edit ${config.displayName}`} description={config.type} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Display name" value={form.displayName ?? ''} onChange={(e) => set('displayName', e.target.value)} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Spread from (pips)" value={form.spreadFrom ?? ''} onChange={(e) => set('spreadFrom', e.target.value)} />
          <Input label="Commission" value={form.commission ?? ''} onChange={(e) => set('commission', e.target.value)} placeholder="$0 or $7 / lot" />
          <Input label="Leverage" value={form.leverage ?? ''} onChange={(e) => set('leverage', e.target.value)} placeholder="1:100" />
          <Input
            label="Min deposit (USD)"
            type="number"
            value={String(form.minDeposit ?? 0)}
            onChange={(e) => set('minDeposit', Math.max(0, Math.floor(Number(e.target.value) || 0)))}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input
            type="checkbox"
            checked={form.popular ?? false}
            onChange={(e) => set('popular', e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40"
          />
          Highlight as the popular / recommended tier
        </label>

        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button loading={saving} onClick={save}>
            Save changes
          </Button>
        </div>
      </div>
    </Modal>
  )
}
