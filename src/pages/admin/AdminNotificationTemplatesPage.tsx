import { useCallback, useEffect, useState } from 'react'
import { Mail, Pencil } from 'lucide-react'
import { Badge, Button, EmptyState, ErrorState, Input, Modal, SkeletonRows, Textarea } from '@/components/ui'
import { PageTitle } from '@/components/portal/PageTitle'
import { useToast } from '@/context/ToastContext'
import { ApiError } from '@/lib/api'
import { adminApi, type NotificationTemplate } from '@/lib/adminApi'

// Placeholders available per template key (shown as a hint in the editor).
const PLACEHOLDERS: Record<string, string[]> = {
  verify_email: ['{{link}}'],
  password_reset: ['{{link}}'],
  welcome: ['{{firstName}}'],
}

export default function AdminNotificationTemplatesPage() {
  const toast = useToast()
  const [rows, setRows] = useState<NotificationTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState<NotificationTemplate | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await adminApi.listNotificationTemplates())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <>
      <PageTitle title="Notification Templates" subtitle="Edit the transactional emails sent to clients." />

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : loading ? (
        <SkeletonRows rows={3} />
      ) : rows.length === 0 ? (
        <EmptyState icon={Mail} title="No templates" description="Run the seed to create the default email templates." />
      ) : (
        <div className="space-y-3">
          {rows.map((tpl) => (
            <div key={tpl.id} className="glass-panel flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-white">{tpl.name}</h3>
                  <Badge tone="neutral">{tpl.key}</Badge>
                </div>
                <p className="mt-1 text-sm text-gray-300">{tpl.subject}</p>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-xs text-gray-500">{tpl.body}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setEditing(tpl)} className="gap-1">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </Button>
            </div>
          ))}
        </div>
      )}

      <EditTemplateModal
        template={editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null)
          await load()
          toast.success('Template updated')
        }}
        onError={(msg) => toast.error('Update failed', msg)}
      />
    </>
  )
}

function EditTemplateModal({
  template,
  onClose,
  onSaved,
  onError,
}: {
  template: NotificationTemplate | null
  onClose: () => void
  onSaved: () => void
  onError: (msg: string) => void
}) {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (template) {
      setSubject(template.subject)
      setBody(template.body)
    }
  }, [template])

  if (!template) return null
  const placeholders = PLACEHOLDERS[template.key] ?? []

  const save = async () => {
    setSaving(true)
    try {
      await adminApi.updateNotificationTemplate(template.id, { subject, body })
      onSaved()
    } catch (e) {
      onError(e instanceof ApiError && e.status === 403 ? 'Only admins can edit templates.' : (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={!!template} onClose={onClose} title={`Edit ${template.name}`} description={template.key} className="max-w-xl">
      <div className="space-y-4">
        <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea label="Body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
        {placeholders.length > 0 && (
          <p className="text-xs text-gray-500">
            Placeholders:{' '}
            {placeholders.map((p) => (
              <code key={p} className="mx-0.5 rounded bg-white/5 px-1.5 py-0.5 text-brand-300">{p}</code>
            ))}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-white/[0.06] pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={save}>Save changes</Button>
        </div>
      </div>
    </Modal>
  )
}
