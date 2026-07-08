import { useCallback, useEffect, useState } from 'react'
import { FileText, Pencil, Plus, Trash2 } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type TextTemplate, type TextTemplateKind } from '@/lib/adminApi'

/** Shared page for PDF Templates (PDF) and Comment Templates (COMMENT). */
export default function AdminTextTemplatesPage({
  kind,
  title,
  subtitle,
}: {
  kind: TextTemplateKind
  title: string
  subtitle: string
}) {
  const toast = useToast()
  const [rows, setRows] = useState<TextTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [editing, setEditing] = useState<TextTemplate | 'new' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listTextTemplates(kind))
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
    toast.error('Action failed', e instanceof ApiError && e.status === 403 ? 'Only admins can manage templates.' : (e as Error).message)

  const toggle = async (t: TextTemplate) => {
    setBusy(t.id)
    try {
      await adminApi.updateTextTemplate(t.id, { enabled: !t.enabled })
      await load()
    } catch (e) {
      fail(e)
    } finally {
      setBusy(null)
    }
  }

  const remove = async (t: TextTemplate) => {
    if (!window.confirm(`Delete "${t.name}"?`)) return
    setBusy(t.id)
    try {
      await adminApi.deleteTextTemplate(t.id)
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
        <Button onClick={() => setEditing('new')} className="gap-1.5"><Plus className="h-4 w-4" /> Add template</Button>
      </div>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={FileText} title="No templates" description="Add the first template." />
      ) : (
        <div className="glass-panel divide-y divide-white/[0.04] p-0">
          {rows.map((t) => (
            <div key={t.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{t.name}</span>
                  <Badge tone={t.enabled ? 'success' : 'neutral'} dot>{t.enabled ? 'Enabled' : 'Disabled'}</Badge>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-gray-500">{t.body}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" loading={busy === t.id} onClick={() => toggle(t)}>{t.enabled ? 'Disable' : 'Enable'}</Button>
                <Button size="sm" variant="outline" onClick={() => setEditing(t)} className="gap-1"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                <Button size="sm" variant="outline" onClick={() => remove(t)} className="gap-1 border-danger/40 text-danger hover:bg-danger/10"><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <TemplateModal
        kind={kind}
        target={editing}
        onClose={() => setEditing(null)}
        onSaved={async (created) => { setEditing(null); await load(); toast.success(created ? 'Added' : 'Updated') }}
        onError={fail}
      />
    </>
  )
}

function TemplateModal({
  kind,
  target,
  onClose,
  onSaved,
  onError,
}: {
  kind: TextTemplateKind
  target: TextTemplate | 'new' | null
  onClose: () => void
  onSaved: (created: boolean) => void
  onError: (e: unknown) => void
}) {
  const isNew = target === 'new'
  const tpl = target && target !== 'new' ? target : null
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (target === 'new') { setName(''); setBody('') }
    else if (target) { setName(target.name); setBody(target.body) }
  }, [target])

  if (!target) return null

  const save = async () => {
    if (!name.trim() || !body.trim()) { onError(new Error('Name and body are required')); return }
    setSaving(true)
    try {
      if (isNew) await adminApi.createTextTemplate({ kind, name: name.trim(), body })
      else if (tpl) await adminApi.updateTextTemplate(tpl.id, { name: name.trim(), body })
      onSaved(isNew)
    } catch (e) {
      onError(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!target} onClose={onClose} title={isNew ? 'Add template' : `Edit ${tpl?.name}`} className="max-w-xl">
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="text-xs text-gray-500">Use <code className="rounded bg-white/5 px-1.5 py-0.5 text-brand-300">{'{{placeholders}}'}</code> that will be filled at generation time.</p>
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>{isNew ? 'Add template' : 'Save changes'}</Button>
        </div>
      </div>
    </Modal>
  )
}
