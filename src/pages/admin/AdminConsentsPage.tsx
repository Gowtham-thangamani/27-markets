import { useCallback, useEffect, useState } from 'react'
import { FileCheck, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type Consent } from '@/lib/adminApi'

export default function AdminConsentsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<Consent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<Consent | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listConsents())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const fail = (e: unknown) =>
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage consents.' : (e as Error).message)

  const toggle = async (c: Consent) => {
    setBusy(c.id)
    try {
      await adminApi.updateConsent(c.id, { enabled: !c.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (c: Consent) => {
    if (!window.confirm(`Delete "${c.label}"?`)) return
    setBusy(c.id)
    try {
      await adminApi.deleteConsent(c.id)
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
        <PageTitle title="Consents" subtitle="Statements clients must agree to during onboarding." />
        <Button onClick={() => setEditing('new')} className="gap-1.5"><Plus className="h-4 w-4" /> Add consent</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileCheck} title="No consents" description="Add the first consent statement." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((c) => (
            <div key={c.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{c.label}</span>
                  {c.required && <Badge tone="warning">Required</Badge>}
                  <Badge tone={c.enabled ? 'success' : 'neutral'} dot>{c.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-gray-500">{c.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" loading={busy === c.id} onClick={() => toggle(c)}>{c.enabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(c)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(c)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConsentModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => { setEditing(null); await load(); toast.success(created ? 'Consent added' : 'Consent updated') }}
        onError={fail}
      />
    </>
  )
}

function ConsentModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: Consent | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const consent = target && target !== 'new' ? target : null
  const [label, setLabel] = useState('')
  const [body, setBody] = useState('')
  const [required, setRequired] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') { setLabel(''); setBody(''); setRequired(true) }
    else if (target) { setLabel(target.label); setBody(target.body); setRequired(target.required) }
  }, [target])

  if (!target) return null

  const save = async () => {
    if (!label.trim() || !body.trim()) { onError(new Error('Label and text are required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createConsent({ label: label.trim(), body: body.trim(), required })
      else if (consent) await adminApi.updateConsent(consent.id, { label: label.trim(), body: body.trim(), required })
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add consent' : `Edit ${consent?.label}`} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Label" value={label} onChange={(e) => setLabel(e.target.value)} />
        <Textarea label="Text (shown to client)" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-gray-300">
          <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="h-4 w-4 rounded border-white/20 bg-ink-800 text-brand-500 focus:ring-brand-500/40" />
          Required to complete onboarding
        </label>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add consent' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
