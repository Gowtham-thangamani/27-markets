import { useCallback, useEffect, useState } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type KycForm } from '@/lib/adminApi'

export default function AdminKycFormsPage() {
  const toast = useToast()
  const [rows, setRows] = useState<KycForm[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<KycForm | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listKycForms())
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
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage forms.' : (e as Error).message)

  const toggle = async (f: KycForm) => {
    setBusy(f.id)
    try {
      await adminApi.updateKycForm(f.id, { enabled: !f.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (f: KycForm) => {
    if (!window.confirm(`Delete "${f.name}"?`)) return
    setBusy(f.id)
    try {
      await adminApi.deleteKycForm(f.id)
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
        <PageTitle title="KYC Forms" subtitle="Onboarding form definitions." />
        <Button onClick={() => setEditing('new')} className="gap-1.5"><Plus className="h-4 w-4" /> Add form</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No forms" description="Add the first KYC form." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((f) => (
            <div key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{f.name}</span>
                  <Badge tone={f.enabled ? 'success' : 'neutral'} dot>{f.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                {f.description && <p className="mt-0.5 text-xs text-gray-500">{f.description}</p>}
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

      <FormModal
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => { setEditing(null); await load(); toast.success(created ? 'Form added' : 'Form updated') }}
        onError={fail}
      />
    </>
  )
}

function FormModal({
  target,
  onClose,
  onSaved,
  onError,
}: {
  target: KycForm | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const form = target && target !== 'new' ? target : null
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') { setName(''); setDescription('') }
    else if (target) { setName(target.name); setDescription(target.description ?? '') }
  }, [target])

  if (!target) return null

  const save = async () => {
    if (!name.trim()) { onError(new Error('Name is required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createKycForm({ name: name.trim(), description: description.trim() || undefined })
      else if (form) await adminApi.updateKycForm(form.id, { name: name.trim(), description: description.trim() })
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add KYC form' : `Edit ${form?.name}`} className="max-w-lg">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add form' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
