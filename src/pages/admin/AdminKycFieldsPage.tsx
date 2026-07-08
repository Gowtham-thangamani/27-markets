import { useCallback, useEffect, useState } from 'react'
import { ListChecks, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type KycFieldDefinition, type KycFieldKind, type KycFieldType } from '@/lib/adminApi'

const FIELD_TYPES: KycFieldType[] = ['TEXT', 'NUMBER', 'DATE', 'SELECT', 'BOOLEAN']

/** Shared page for KYC Questions (QUESTION) and Extended Fields (EXTENDED). */
export default function AdminKycFieldsPage({
  kind,
  title,
  subtitle,
}: {
  kind: KycFieldKind
  title: string
  subtitle: string
}) {
  const toast = useToast()
  const [rows, setRows] = useState<KycFieldDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<KycFieldDefinition | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listKycFields(kind))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [kind])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage these.' : (e as Error).message)

  const toggle = async (f: KycFieldDefinition) => {
    setBusy(f.id)
    try {
      await adminApi.updateKycField(f.id, { enabled: !f.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (f: KycFieldDefinition) => {
    if (!window.confirm(`Delete "${f.label}"?`)) return
    setBusy(f.id)
    try {
      await adminApi.deleteKycField(f.id)
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
      <div className="flex items-center justify-between gap-4">
        <PageTitle title={title} subtitle={subtitle} />
        <Button onClick={() => setEditing('new')} className="gap-1.5">
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={4} />
      ) : rows.length === 0 ? (
        <EmptyState icon={ListChecks} title="Nothing yet" description="Add the first one." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-white">{f.label}</span>
                <Badge tone="neutral">{f.fieldType}</Badge>
                {f.required && <Badge tone="warning">Required</Badge>}
                <Badge tone={f.enabled ? 'success' : 'neutral'} dot>{f.enabled ? 'Enabled' : 'Disabled'}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" loading={busy === f.id} onClick={() => toggle(f)}>{f.enabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(f)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(f)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <FieldModal
        kind={kind}
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => {
          setEditing(null)
          await load()
          toast.success(created ? 'Added' : 'Updated')
        }}
        onError={fail}
      />
    </>
  )
}

function FieldModal({
  kind,
  target,
  onClose,
  onSaved,
  onError,
}: {
  kind: KycFieldKind
  target: KycFieldDefinition | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const field = target && target !== 'new' ? target : null
  const [label, setLabel] = useState('')
  const [fieldType, setFieldType] = useState<KycFieldType>('TEXT')
  const [required, setRequired] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') {
      setLabel(''); setFieldType('TEXT'); setRequired(false)
    } else if (target) {
      setLabel(target.label); setFieldType(target.fieldType); setRequired(target.required)
    }
  }, [target])

  if (!target) return null

  const save = async () => {
    if (!label.trim()) { onError(new Error('Label is required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createKycField({ kind, label: label.trim(), fieldType, required })
      else if (field) await adminApi.updateKycField(field.id, { label: label.trim(), fieldType, required })
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add field' : 'Edit field'} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-300">Type</label>
          <select
            value={fieldType}
            onChange={(e) => setFieldType(e.target.value as KycFieldType)}
            className="w-full rounded-lg border border-white/10 bg-ink-800 px-3 py-2.5 text-sm text-white focus:border-brand-500/50 focus:outline-none"
          >
            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40" />
          Required
        </label>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
